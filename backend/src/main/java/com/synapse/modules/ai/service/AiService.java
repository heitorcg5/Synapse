package com.synapse.modules.ai.service;

import com.synapse.modules.ai.AiCallOptions;

import java.util.List;

/**
 * Provider-agnostic AI service. Use {@link AiCallOptions} for language and summary depth.
 */
public interface AiService {

    String summarize(String text, AiCallOptions options);

    String generateTitle(String text, AiCallOptions options);

    TitleAndSummary summarizeWithTitle(String text, AiCallOptions options);

    default TitleAndSummary summarizeWithTitleFallback(String text, AiCallOptions options) {
        String summary = summarize(text, options);
        String title = deriveTitleFromSummary(summary, options.responseLanguage());
        return new TitleAndSummary(title, summary);
    }

    default String deriveTitleFromSummary(String summary, String language) {
        if (summary == null || summary.isBlank()) {
            return language != null && language.startsWith("es") ? "Título" : "Title";
        }
        String firstLine = summary.split("\\R", 2)[0].trim();
        if (firstLine.isEmpty()) firstLine = summary.trim();
        String[] words = firstLine.replaceAll("[\\.:;!?]+$", "").split("\\s+");
        int take = Math.min(words.length, 8);
        if (take == 0) return language != null && language.startsWith("es") ? "Título" : "Title";
        String title = String.join(" ", java.util.Arrays.copyOfRange(words, 0, take)).trim();
        return title.isBlank() ? (language != null && language.startsWith("es") ? "Título" : "Title") : title;
    }

    record TitleAndSummary(String title, String summary) {}

    List<String> classify(String text, AiCallOptions options);

    List<String> generateTags(String text, AiCallOptions options);

    /**
     * Generates a vector embedding for the given text.
     */
    List<Float> generateEmbedding(String text);

    String getModelName();
}
