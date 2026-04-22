package com.synapse.modules.ai;

/**
 * Language and summary style for a single AI call.
 *
 * @param chunkSizeCharsOverride when non-null, overrides application default chunk size (characters).
 */
public record AiCallOptions(String responseLanguage, SummaryDetailLevel summaryDetail, Integer chunkSizeCharsOverride) {

    public AiCallOptions(String responseLanguage, SummaryDetailLevel summaryDetail) {
        this(responseLanguage, summaryDetail, null);
    }

    public AiCallOptions {
        if (responseLanguage == null || responseLanguage.isBlank()) {
            responseLanguage = "en";
        } else {
            responseLanguage = responseLanguage.toLowerCase().startsWith("es") ? "es" : "en";
        }
        if (summaryDetail == null) {
            summaryDetail = SummaryDetailLevel.MEDIUM;
        }
    }

    public String previewCacheKey() {
        return responseLanguage + ":" + summaryDetail.name() + ":" + (chunkSizeCharsOverride != null ? chunkSizeCharsOverride : "");
    }
}
