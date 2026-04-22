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
import java.util.Arrays;
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
            "You are a concise summarizer. Use ONLY what appears in the user's Content block. Do not add generic "
                    + "background about hosting platforms (e.g. YouTube/Google privacy, moderation, or copyright rules) "
                    + "unless that is clearly the main subject of the Content. Reply only with the summary, no preamble. "
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
            "You generate titles and summaries STRICTLY from the provided Content block. %s\n"
                    + "Rules: Summarize only what is stated there. Do NOT pad with encyclopedic facts about YouTube, "
                    + "Google, privacy policies, moderation systems, or copyright in general unless that material is clearly "
                    + "the main substance of the Content (e.g. the capture is an article about those policies).\n"
                    + "If the Content is only a video title, channel name, and link with no transcript or description, "
                    + "infer the likely real-world topic from the title and channel only—keep the summary concrete and "
                    + "specific to that topic; do not explain how YouTube works as a product.\n"
                    + "Reply ONLY in this format:\nTITLE: [3-8 word title]\n\nSUMMARY: [your summary]\nNo preamble. "
                    + "Reply in %s.";
    private static final int MIN_CHUNK = 500;
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

    private int effectiveChunkChars(AiCallOptions options) {
        if (options != null && options.chunkSizeCharsOverride() != null && options.chunkSizeCharsOverride() > 0) {
            return options.chunkSizeCharsOverride();
        }
        return chunkSizeChars;
    }

    @Override
    public String summarize(String text, AiCallOptions options) {
        if (text == null || text.isBlank()) {
            return "";
        }
        AiCallOptions opts = options != null ? options : new AiCallOptions("en", SummaryDetailLevel.MEDIUM);
        String cleaned = cleanText(text);
        int maxChunk = effectiveChunkChars(opts);
        try {
            if (cleaned.length() <= maxChunk) {
                return summarizeChunk(cleaned, opts);
            }
            List<String> chunks = chunkText(cleaned, maxChunk);
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
                            + "Content:\n%s",
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
        String cleaned = cleanText(text);
        if (cleaned.length() > chunkSizeChars) {
            cleaned = cleaned.substring(0, chunkSizeChars) + "...";
        }
        try {
            String prompt = String.format(
                    "Generate a title and summary for the following capture. Stay anchored to this text only.\n\n"
                            + "Content:\n%s",
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
        String title = "";
        String summary = "";
        String[] parts = response.split("(?i)SUMMARY:\\s*", 2);
        if (parts.length >= 2) {
            summary = parts[1].trim();
            String titlePart = parts[0].trim();
            if (titlePart.toUpperCase().startsWith("TITLE:")) {
                title = titlePart.substring(6).trim();
            }
        }
        if (title.isBlank()) title = deriveTitleFromSummary(summary.isBlank() ? response : summary, lang);
        if (summary.isBlank()) summary = response.trim();
        return new AiService.TitleAndSummary(title, summary);
    }

    @Override
    public List<String> classify(String text, AiCallOptions options) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        AiCallOptions opts = options != null ? options : new AiCallOptions("en", SummaryDetailLevel.MEDIUM);
        String cleaned = cleanText(text);
        int maxChunk = effectiveChunkChars(opts);
        if (cleaned.length() > maxChunk) {
            cleaned = cleaned.substring(0, maxChunk) + "...";
        }
        try {
            String prompt = String.format(
                    "Classify the following text into 3 to 5 topics. Reply in %s.\n\nContent: %s\n\nReturn the result as JSON.",
                    langName(opts.responseLanguage()), cleaned);
            String systemMessage = String.format(CLASSIFICATION_SYSTEM_TEMPLATE, langName(opts.responseLanguage()));
            String response = ollamaClient.generate(prompt, systemMessage, CLASSIFY_OPTIONS);
            return parseTopicsFromResponse(response);
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
        String cleaned = cleanText(text);
        int maxChunk = effectiveChunkChars(opts);
        if (cleaned.length() > maxChunk) {
            cleaned = cleaned.substring(0, maxChunk) + "...";
        }
        try {
            String prompt = String.format(
                    "Infer tags from the following Content.\n\nContent:\n%s",
                    cleaned);
            String systemMessage = String.format(TAGS_SYSTEM_TEMPLATE, langName(opts.responseLanguage()));
            String response = ollamaClient.generate(prompt, systemMessage, TAG_OPTIONS);
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

    private List<String> chunkText(String text, int maxChunkSize) {
        List<String> chunks = new ArrayList<>();
        int start = 0;
        while (start < text.length()) {
            int end = Math.min(start + maxChunkSize, text.length());
            if (end < text.length()) {
                int lastSpace = text.lastIndexOf(' ', end);
                if (lastSpace > start + MIN_CHUNK) {
                    end = lastSpace + 1;
                }
            }
            chunks.add(text.substring(start, end).trim());
            start = end;
        }
        return chunks;
    }

    private List<String> parseTopicsFromResponse(String response) {
        if (response == null || response.isBlank()) {
            return List.of("general");
        }
        String trimmed = response.trim();
        int start = trimmed.indexOf('[');
        int end = trimmed.lastIndexOf(']');
        if (start >= 0 && end > start) {
            try {
                String json = trimmed.substring(start, end + 1);
                List<String> topics = objectMapper.readValue(json, new TypeReference<>() {});
                if (topics != null && !topics.isEmpty()) {
                    return topics.stream()
                            .map(String::trim)
                            .filter(s -> !s.isEmpty())
                            .limit(5)
                            .collect(Collectors.toList());
                }
            } catch (Exception e) {
                log.debug("Could not parse topics as JSON: {}", e.getMessage());
            }
        }
        Matcher quoted = Pattern.compile("\"([^\"]+)\"").matcher(trimmed);
        List<String> topics = new ArrayList<>();
        while (quoted.find() && topics.size() < 5) {
            String topic = quoted.group(1).trim();
            if (!topic.isEmpty()) topics.add(topic);
        }
        if (!topics.isEmpty()) return topics;
        String[] byComma = trimmed.split("[,;\\n]");
        return Arrays.stream(byComma)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.replaceAll("^[\\[\\]\"]+|[\\[\\]\"]+$", "").trim())
                .filter(s -> !s.isEmpty())
                .limit(5)
                .collect(Collectors.toList());
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
