package com.synapse.modules.ai.provider;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Ollama provider implementation. Prepares prompts, calls Ollama API via
 * OllamaClient, and parses responses. Supports chunking for large documents.
 */
@Component
@ConditionalOnProperty(name = "synapse.ai.provider", havingValue = "ollama", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class OllamaProvider implements AiService {

    private static final String SUMMARY_SYSTEM = "You are a concise summarizer. Reply only with the summary, no preamble.";
    private static final String CLASSIFICATION_SYSTEM = "You are a content classifier. Reply only with a JSON array of 3 to 5 topic names, e.g. [\"topic1\", \"topic2\"].";
    private static final int MIN_CHUNK = 500;

    private final OllamaClient ollamaClient;
    private final ObjectMapper objectMapper;

    @Value("${synapse.ai.model:llama3}")
    private String modelName;

    @Value("${synapse.ai.chunk-size-chars:6000}")
    private int chunkSizeChars;

    @Override
    public String summarize(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        String cleaned = cleanText(text);
        try {
            if (cleaned.length() <= chunkSizeChars) {
                return summarizeChunk(cleaned);
            }
            List<String> chunks = chunkText(cleaned, chunkSizeChars);
            List<String> chunkSummaries = new ArrayList<>();
            for (String chunk : chunks) {
                String summary = summarizeChunk(chunk);
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
            return summarizeChunk(merged);
        } catch (OllamaException e) {
            log.warn("Ollama summary failed, using fallback: {}", e.getMessage());
            return fallbackSummary(cleaned);
        }
    }

    @Override
    public List<String> classify(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        String cleaned = cleanText(text);
        if (cleaned.length() > chunkSizeChars) {
            cleaned = cleaned.substring(0, chunkSizeChars) + "...";
        }
        try {
            String prompt = "Classify the following text into 3 to 5 topics.\n\nContent: " + cleaned + "\n\nReturn the result as JSON.";
            String response = ollamaClient.generate(prompt, CLASSIFICATION_SYSTEM);
            return parseTopicsFromResponse(response);
        } catch (OllamaException e) {
            log.warn("Ollama classification failed, using fallback: {}", e.getMessage());
            return List.of("uncategorized");
        }
    }

    @Override
    public List<String> generateTags(String text) {
        return classify(text);
    }

    @Override
    public String getModelName() {
        return modelName;
    }

    private String summarizeChunk(String chunk) {
        String prompt = "Summarize the following content in three concise paragraphs.\n\nContent: " + chunk;
        return ollamaClient.generate(prompt, SUMMARY_SYSTEM);
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

    private String fallbackSummary(String text) {
        if (text.length() <= 500) return "Summary: " + text;
        return "Summary: " + text.substring(0, 500) + "...";
    }
}
