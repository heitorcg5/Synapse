package com.synapse.modules.user.util;

import com.synapse.modules.user.entity.User;

import java.util.Locale;
import java.util.Set;

/**
 * Capture/processing flow preferences stored on {@link User}.
 */
public final class UserProcessingPreferences {

    private static final Set<String> PROCESSING_MODES = Set.of("immediate", "background", "manual");
    private static final Set<String> CHUNK_TOKEN_TIERS = Set.of("500", "1000", "2000");
    /** ~4 chars per token for rough LLM chunking alignment. */
    private static final int CHARS_PER_TOKEN = 4;

    private UserProcessingPreferences() {}

    /**
     * {@code immediate} = run pipeline right after capture; {@code background} = queued worker;
     * {@code manual} = user triggers processing. Legacy: {@link User#getAiAutoProcessCapture()}
     * when {@link User#getProcessingMode()} is null.
     */
    public static String effectiveProcessingMode(User user) {
        String raw = user.getProcessingMode();
        if (raw != null && !raw.isBlank()) {
            return raw.trim().toLowerCase(Locale.ROOT);
        }
        return Boolean.TRUE.equals(user.getAiAutoProcessCapture()) ? "immediate" : "manual";
    }

    public static void syncAutoProcessFlagFromMode(User user, String modeLower) {
        user.setAiAutoProcessCapture("immediate".equals(modeLower));
    }

    public static boolean isPipelineSummarizeOn(User u) {
        return !Boolean.FALSE.equals(u.getPipelineSummarize());
    }

    public static boolean isPipelineClassifyOn(User u) {
        return !Boolean.FALSE.equals(u.getPipelineClassify());
    }

    public static boolean isPipelineGenerateTagsOn(User u) {
        return !Boolean.FALSE.equals(u.getPipelineGenerateTags());
    }

    public static boolean isPipelineDetectDuplicatesOn(User u) {
        return Boolean.TRUE.equals(u.getPipelineDetectDuplicates());
    }

    public static boolean isPipelineSuggestConnectionsOn(User u) {
        return Boolean.TRUE.equals(u.getPipelineSuggestConnections());
    }

    /** Stored tier: 500 / 1000 / 2000 (tokens); maps to approximate character chunk size. */
    public static int chunkSizeChars(User u) {
        String tier = u.getAiChunkSizeTokens();
        if (tier == null || tier.isBlank()) {
            return 1000 * CHARS_PER_TOKEN;
        }
        String t = tier.trim();
        if (!CHUNK_TOKEN_TIERS.contains(t)) {
            return 1000 * CHARS_PER_TOKEN;
        }
        return Integer.parseInt(t) * CHARS_PER_TOKEN;
    }

    public static boolean isValidProcessingMode(String mode) {
        if (mode == null || mode.isBlank()) {
            return false;
        }
        return PROCESSING_MODES.contains(mode.trim().toLowerCase(Locale.ROOT));
    }

    public static boolean isValidChunkTokenTier(String tier) {
        if (tier == null || tier.isBlank()) {
            return false;
        }
        return CHUNK_TOKEN_TIERS.contains(tier.trim());
    }
}
