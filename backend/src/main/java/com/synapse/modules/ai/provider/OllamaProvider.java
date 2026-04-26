package com.synapse.modules.ai.provider;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.synapse.modules.ai.AiCallOptions;
import com.synapse.modules.ai.SummaryDetailLevel;
import com.synapse.modules.ai.client.OllamaClient;
import com.synapse.modules.ai.client.OllamaException;
import com.synapse.modules.ai.service.AiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Component
@ConditionalOnProperty(name = "synapse.ai.provider", havingValue = "ollama", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class OllamaProvider implements AiService {

    private static final String SUMMARY_SYSTEM_TEMPLATE =
            "You are a concise summarizer. Use ONLY what appears in the user's InboxItem block. Do not add generic "
                    + "background about hosting platforms (e.g. YouTube/Google privacy, moderation, or copyright rules) "
                    + "unless that is clearly the main subject of the InboxItem. Reply only with the summary, no preamble. "
                    + "Reply in %s.";
    private static final String CLASSIFICATION_SYSTEM_TEMPLATE =
            "You are a content classifier. Infer topics from the substantive subject of the text; do not label with "
                    + "generic platform names unless the capture is actually about that platform. Reply only with a JSON "
                    + "array of 3 to 5 topic names. Reply in %s.";
    private static final String TITLE_SYSTEM_TEMPLATE =
            "You are a title generator. Use only the supplied text; do not substitute a generic title about a video "
                    + "platform unless the text is about that. Reply only with the title text, no preamble and no quotes. "
                    + "Reply in %s.";
    private static final String TITLE_SUMMARY_SYSTEM_TEMPLATE =
            "You generate titles and summaries STRICTLY from the provided InboxItem block. %s\n"
                    + "Rules: Summarize only what is stated there. Do NOT pad with encyclopedic facts about YouTube, "
                    + "Google, privacy policies, moderation systems, or copyright in general unless that material is clearly "
                    + "the main substance of the InboxItem (e.g. the capture is an article about those policies).\n"
                    + "If the InboxItem is only a video title, channel name, and link with no transcript or description, "
                    + "infer the likely real-world topic from the title and channel only—keep the summary concrete and "
                    + "specific to that topic; do not explain how YouTube works as a product.\n"
                    + "Reply ONLY in this format:\nTITLE: [3-8 word title]\n\nSUMMARY: [your summary text only, no label repeats]\nNo preamble. "
                    + "Reply in %s.";
    private static final Pattern SUMMARY_SPLIT_PATTERN = Pattern.compile("(?is)\\b(?:summary|resumen)\\s*:\\s*");
    private static final Pattern TITLE_PREFIX_PATTERN = Pattern.compile("(?is)^\\s*(?:title|titulo|título)\\s*:\\s*");
    private static final Pattern SUMMARY_PREFIX_PATTERN = Pattern.compile("(?is)^\\s*(?:summary|resumen)\\s*:\\s*");
    private static final int MIN_CHUNK_TOKENS = 120;
    private static final int APPROX_CHARS_PER_TOKEN = 4;
    private static final Map<String, Object> CLASSIFY_OPTIONS = Map.of("num_predict", 80, "temperature", 0.35);
    private static final String TAGS_SYSTEM_TEMPLATE =
            "You output short keywords (tags) for the user's content: technologies, topics, domains. "
                    + "No sentences. Reply ONLY with compact JSON: {\"tags\":[\"one\",\"two\",\"three\"]}. "
                    + "Use between 3 and 8 tags. Reply in %s.";
    private static final Map<String, Object> TAG_OPTIONS = Map.of("num_predict", 160, "temperature", 0.28);

    private final OllamaClient ollamaClient;
    private final ObjectMapper objectMapper;

    @Value("${synapse.ai.model:llama3}")
    private String modelName;

    @Value("${synapse.ai.chunk-size-chars:6000}")
    private int chunkSizeChars;
    @Value("${synapse.ai.chunk-size-tokens:1500}")
    private int chunkSizeTokens;

    private int effectiveChunkChars(AiCallOptions options) {
        if (options != null && options.chunkSizeCharsOverride() != null && options.chunkSizeCharsOverride() > 0) {
            return options.chunkSizeCharsOverride();
        }
        return chunkSizeChars;
    }

    private int effectiveChunkTokens(AiCallOptions options) {
        if (options != null && options.chunkSizeCharsOverride() != null && options.chunkSizeCharsOverride() > 0) {
            return Math.max(200, options.chunkSizeCharsOverride() / APPROX_CHARS_PER_TOKEN);
        }
        return chunkSizeTokens;
    }

    @Override
    public String summarize(String text, AiCallOptions options) {
        if (text == null || text.isBlank()) {
            return "";
        }
        AiCallOptions opts = options != null ? options : new AiCallOptions("en", SummaryDetailLevel.MEDIUM);
        String cleaned = cleanText(text);
        int maxChunkTokens = effectiveChunkTokens(opts);
        int maxChunkChars = effectiveChunkChars(opts);
        try {
            if (estimateTokens(cleaned) <= maxChunkTokens) {
                return summarizeChunk(cleaned, opts);
            }
            List<String> chunks = chunkTextByTokens(cleaned, maxChunkTokens, maxChunkChars);
            List<String> chunkSummaries = new ArrayList<>();
            for (String chunk : chunks) {
                String summary = summarizeChunk(chunk, opts);
                if (!summary.isBlank()) {
                    chunkSummaries.add(summary);
                }
            }
            if (chunkSummaries.isEmpty()) {
                return "Summary not available.";
            }
            if (chunkSummaries.size() == 1) {
                return chunkSummaries.get(0);
            }
            String merged = String.join("\n\n", chunkSummaries);
            return summarizeChunk(merged, opts);
        } catch (OllamaException e) {
            log.warn("Ollama summary failed: {}", e.getMessage());
            return fallbackSummary(cleaned, opts.responseLanguage());
        }
    }

    @Override
    public String generateTitle(String text, AiCallOptions options) {
        if (text == null || text.isBlank()) {
            return "";
        }
        AiCallOptions opts = options != null ? options : new AiCallOptions("en", SummaryDetailLevel.MEDIUM);
        String cleaned = cleanText(text);
        try {
            String prompt = String.format(
                    "Generate a concise title (3 to 10 words) based only on the following content. "
                            + "Do not use a generic title about a video platform unless the text is about that.\n\n"
                            + "InboxItem:\n%s",
                    cleaned);
            String systemMessage = String.format(TITLE_SYSTEM_TEMPLATE, langName(opts.responseLanguage()));
            String response = ollamaClient.generate(prompt, systemMessage, opts.summaryDetail().titleOnlyOptions());
            String title = response == null ? "" : response.trim();
            if (title.startsWith("\"") && title.endsWith("\"") && title.length() >= 2) {
                title = title.substring(1, title.length() - 1).trim();
            }
            return title;
        } catch (OllamaException e) {
            log.warn("Ollama generateTitle failed: {}", e.getMessage());
            return fallbackTitle(opts.responseLanguage());
        }
    }

    @Override
    public AiService.TitleAndSummary summarizeWithTitle(String text, AiCallOptions options) {
        if (text == null || text.isBlank()) {
            AiCallOptions opts = options != null ? options : new AiCallOptions("en", SummaryDetailLevel.MEDIUM);
            return new AiService.TitleAndSummary(fallbackTitle(opts.responseLanguage()), "");
        }
        AiCallOptions opts = options != null ? options : new AiCallOptions("en", SummaryDetailLevel.MEDIUM);
        String cleaned = truncateToTokenBudget(cleanText(text), effectiveChunkTokens(opts), effectiveChunkChars(opts));
        try {
            String prompt = String.format(
                    "Generate a title and summary for the following capture. Stay anchored to this text only.\n\n"
                            + "InboxItem:\n%s",
                    cleaned);
            SummaryDetailLevel d = opts.summaryDetail();
            String systemMessage = String.format(
                    TITLE_SUMMARY_SYSTEM_TEMPLATE,
                    d.titleSummaryInstruction(),
                    langName(opts.responseLanguage()));
            String response = ollamaClient.generate(prompt, systemMessage, d.previewOptions());
            return parseTitleAndSummary(response, opts.responseLanguage());
        } catch (OllamaException e) {
            log.warn("summarizeWithTitle failed, using fallback: {}", e.getMessage());
            return summarizeWithTitleFallback(cleaned, opts);
        }
    }

    private AiService.TitleAndSummary parseTitleAndSummary(String response, String lang) {
        if (response == null || response.isBlank()) {
            return new AiService.TitleAndSummary(fallbackTitle(lang), "");
        }
        String raw = response.trim();
        String title = "";
        String summary = "";

        Matcher split = SUMMARY_SPLIT_PATTERN.matcher(raw);
        if (split.find()) {
            summary = raw.substring(split.end()).trim();
            String titlePart = raw.substring(0, split.start()).trim();
            title = TITLE_PREFIX_PATTERN.matcher(titlePart).replaceFirst("").trim();
        }

        if (title.isBlank()) {
            title = deriveTitleFromSummary(summary.isBlank() ? raw : summary, lang);
        }
        if (summary.isBlank()) {
            summary = raw;
        }

        title = TITLE_PREFIX_PATTERN.matcher(title).replaceFirst("").trim();
        summary = SUMMARY_PREFIX_PATTERN.matcher(summary).replaceFirst("").trim();
        // If model repeats title line in summary, strip it for a cleaner UX.
        String titleLine = title.trim();
        if (!titleLine.isBlank() && summary.regionMatches(true, 0, titleLine, 0, titleLine.length())) {
            summary = summary.substring(titleLine.length()).trim();
            summary = SUMMARY_PREFIX_PATTERN.matcher(summary).replaceFirst("").trim();
        }

        return new AiService.TitleAndSummary(title, summary);
    }

    @Override
    public List<String> classify(String text, AiCallOptions options) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        AiCallOptions opts = options != null ? options : new AiCallOptions("en", SummaryDetailLevel.MEDIUM);
        String cleaned = truncateToTokenBudget(cleanText(text), effectiveChunkTokens(opts), effectiveChunkChars(opts));
        try {
            String prompt = String.format(
                    "Classify the following text into 3 to 5 topics. Reply in %s.\n\nContent: %s\n\nReturn the result as JSON.",
                    langName(opts.responseLanguage()), cleaned);
            String systemMessage = String.format(CLASSIFICATION_SYSTEM_TEMPLATE, langName(opts.responseLanguage()));
            String response = ollamaClient.generateJson(prompt, systemMessage, CLASSIFY_OPTIONS);
            return parseTopicsFromResponse(response, opts.responseLanguage());
        } catch (OllamaException e) {
            log.warn("Ollama classification failed: {}", e.getMessage());
            return fallbackTopics(opts.responseLanguage());
        }
    }

    @Override
    public List<String> generateTags(String text, AiCallOptions options) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        AiCallOptions opts = options != null ? options : new AiCallOptions("en", SummaryDetailLevel.MEDIUM);
        String cleaned = truncateToTokenBudget(cleanText(text), effectiveChunkTokens(opts), effectiveChunkChars(opts));
        try {
            String prompt = String.format(
                    "Infer tags from the following InboxItem.\n\nContent:\n%s",
                    cleaned);
            String systemMessage = String.format(TAGS_SYSTEM_TEMPLATE, langName(opts.responseLanguage()));
            String response = ollamaClient.generateJson(prompt, systemMessage, TAG_OPTIONS);
            List<String> tags = parseTagsObject(response);
            if (!tags.isEmpty()) {
                return tags;
            }
        } catch (OllamaException e) {
            log.warn("Ollama tag generation failed: {}", e.getMessage());
        }
        return classify(text, options);
    }

    private List<String> parseTagsObject(String response) {
        if (response == null || response.isBlank()) {
            return List.of();
        }
        String trimmed = response.trim();
        try {
            JsonNode root = objectMapper.readTree(trimmed);
            JsonNode arr = root.get("tags");
            if (arr != null && arr.isArray()) {
                List<String> tags = new ArrayList<>();
                for (JsonNode n : arr) {
                    if (n != null && n.isTextual()) {
                        String t = n.asText().trim();
                        if (!t.isEmpty()) {
                            tags.add(t);
                        }
                    }
                }
                if (!tags.isEmpty()) {
                    return tags.stream().limit(12).collect(Collectors.toList());
                }
            }
        } catch (Exception e) {
            log.debug("Could not parse tags object: {}", e.getMessage());
        }
        int start = trimmed.indexOf('[');
        int end = trimmed.lastIndexOf(']');
        if (start >= 0 && end > start) {
            try {
                String json = trimmed.substring(start, end + 1);
                List<String> tags = objectMapper.readValue(json, new TypeReference<>() {});
                if (tags != null && !tags.isEmpty()) {
                    return tags.stream()
                            .map(String::trim)
                            .filter(s -> !s.isEmpty())
                            .limit(12)
                            .collect(Collectors.toList());
                }
            } catch (Exception ignored) {
            }
        }
        return List.of();
    }

    @Override
    public List<Float> generateEmbedding(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        // Embeddings perform better on clean, focused text.
        String cleaned = truncateToTokenBudget(cleanText(text), 1000, 4000);
        return ollamaClient.generateEmbedding(cleaned);
    }

    @Override
    public String getModelName() {
        return modelName;
    }

    private String summarizeChunk(String chunk, AiCallOptions options) {
        SummaryDetailLevel d = options.summaryDetail();
        String lang = langName(options.responseLanguage());
        String prompt = String.format(
                "Summarize the following content in %s. %s Base the summary only on this text.\n\nContent:\n%s",
                lang, d.summarizeInstruction(), chunk);
        String systemMessage = String.format(SUMMARY_SYSTEM_TEMPLATE, lang);
        return ollamaClient.generate(prompt, systemMessage, d.ollamaOptions());
    }

    private static String langName(String code) {
        if (code == null) return "English";
        if (code.startsWith("es")) return "Spanish";
        return "English";
    }

    private String cleanText(String raw) {
        if (raw == null) return "";
        return raw.trim().replaceAll("\\s+", " ");
    }

    private List<String> chunkTextByTokens(String text, int maxChunkTokens, int maxChunkChars) {
        List<String> chunks = new ArrayList<>();
        String[] words = text.split("\\s+");
        StringBuilder current = new StringBuilder();
        int tokenCount = 0;
        for (String word : words) {
            if (word == null || word.isBlank()) {
                continue;
            }
            int wordTokens = estimateTokens(word);
            boolean chunkWouldOverflowTokens = tokenCount + wordTokens > maxChunkTokens;
            boolean chunkWouldOverflowChars = current.length() + word.length() + 1 > maxChunkChars;
            if ((chunkWouldOverflowTokens || chunkWouldOverflowChars) && tokenCount >= MIN_CHUNK_TOKENS) {
                chunks.add(current.toString().trim());
                current.setLength(0);
                tokenCount = 0;
            }
            if (current.length() > 0) {
                current.append(' ');
            }
            current.append(word);
            tokenCount += wordTokens;
        }
        if (current.length() > 0) {
            chunks.add(current.toString().trim());
        }
        return chunks;
    }

    private List<String> parseTopicsFromResponse(String response, String language) {
        if (response == null || response.isBlank()) {
            return List.of("general");
        }
        String trimmed = response.trim();
        try {
            JsonNode root = objectMapper.readTree(trimmed);
            JsonNode arr = root;
            if (root.isObject()) {
                arr = root.get("topics");
            }
            if (arr != null && arr.isArray()) {
                List<String> topics = new ArrayList<>();
                for (JsonNode n : arr) {
                    if (n != null && n.isTextual()) {
                        String topic = n.asText().trim();
                        if (!topic.isEmpty()) {
                            topics.add(topic);
                        }
                    }
                }
                if (!topics.isEmpty()) {
                    return topics.stream().limit(5).collect(Collectors.toList());
                }
            }
        } catch (Exception e) {
            log.debug("Could not parse topics JSON: {}", e.getMessage());
        }
        return fallbackTopics(language);
    }

    private String truncateToTokenBudget(String text, int maxTokens, int maxChars) {
        if (text == null || text.isBlank()) {
            return "";
        }
        if (estimateTokens(text) <= maxTokens && text.length() <= maxChars) {
            return text;
        }
        StringBuilder sb = new StringBuilder();
        int tokenCount = 0;
        for (String word : text.split("\\s+")) {
            if (word == null || word.isBlank()) continue;
            int t = estimateTokens(word);
            if (tokenCount + t > maxTokens || sb.length() + word.length() + 1 > maxChars) {
                break;
            }
            if (sb.length() > 0) sb.append(' ');
            sb.append(word);
            tokenCount += t;
        }
        return sb.toString().trim() + "...";
    }

    private int estimateTokens(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        int chars = text.length();
        return Math.max(1, (int) Math.ceil(chars / (double) APPROX_CHARS_PER_TOKEN));
    }

    private String fallbackSummary(String text, String language) {
        String prefix = language != null && language.startsWith("es") ? "Resumen: " : "Summary: ";
        if (text.length() <= 500) return prefix + text;
        return prefix + text.substring(0, 500) + "...";
    }

    private List<String> fallbackTopics(String language) {
        if (language != null && language.startsWith("es")) {
            return List.of("sin categoría");
        }
        return List.of("uncategorized");
    }

    private String fallbackTitle(String language) {
        if (language != null && language.startsWith("es")) {
            return "Título";
        }
        return "Title";
    }
}
