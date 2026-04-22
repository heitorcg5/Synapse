package com.synapse.modules.ai;

import java.util.Locale;
import java.util.Map;

/**
 * Controls summary length / depth for AI generation (tokens, temperature, prompts).
 */
public enum SummaryDetailLevel {
    SHORT(
            Map.of("num_predict", 180, "temperature", 0.25),
            "Write exactly one short paragraph (3–5 sentences). Be concise.",
            "The summary must be one short paragraph (3–5 sentences). The title must capture the main theme.",
            320
    ),
    MEDIUM(
            Map.of("num_predict", 420, "temperature", 0.45),
            "Write 2–3 clear paragraphs that cover the main ideas.",
            "The summary must be 2–3 paragraphs. The title must capture the main theme (not the opening line).",
            480
    ),
    DETAILED(
            Map.of("num_predict", 900, "temperature", 0.62),
            "Write a thorough summary in several paragraphs: key points, structure, and important implications where relevant.",
            "The summary must be detailed (several paragraphs). The title must reflect the overarching topic.",
            850
    );

    private final Map<String, Object> ollamaOptions;
    private final String summarizeInstruction;
    private final String titleSummaryInstruction;
    private final int previewNumPredict;

    SummaryDetailLevel(
            Map<String, Object> ollamaOptions,
            String summarizeInstruction,
            String titleSummaryInstruction,
            int previewNumPredict
    ) {
        this.ollamaOptions = ollamaOptions;
        this.summarizeInstruction = summarizeInstruction;
        this.titleSummaryInstruction = titleSummaryInstruction;
        this.previewNumPredict = previewNumPredict;
    }

    public Map<String, Object> ollamaOptions() {
        return ollamaOptions;
    }

    public Map<String, Object> previewOptions() {
        return Map.of(
                "num_predict", previewNumPredict,
                "temperature", ollamaOptions.getOrDefault("temperature", 0.45)
        );
    }

    public Map<String, Object> titleOnlyOptions() {
        return Map.of(
                "num_predict", Math.min(120, previewNumPredict / 3),
                "temperature", Math.min(0.5, ((Number) ollamaOptions.getOrDefault("temperature", 0.45)).doubleValue())
        );
    }

    public String summarizeInstruction() {
        return summarizeInstruction;
    }

    public String titleSummaryInstruction() {
        return titleSummaryInstruction;
    }

    public static SummaryDetailLevel fromStored(String code) {
        if (code == null || code.isBlank()) {
            return MEDIUM;
        }
        String n = code.trim().toLowerCase(Locale.ROOT);
        return switch (n) {
            case "short" -> SHORT;
            case "detailed" -> DETAILED;
            default -> MEDIUM;
        };
    }
}
