package com.synapse.modules.user.util;

import com.synapse.modules.user.entity.User;

import java.util.Locale;

public final class UserKnowledgeExportPreferences {

    private UserKnowledgeExportPreferences() {}

    /** Stored and API values: {@code markdown} | {@code json} | {@code pdf}. */
    public static String effectiveExportFormat(User user) {
        String n = user != null ? normalizeFormat(user.getKnowledgeExportFormat()) : null;
        return n != null ? n : "markdown";
    }

    /**
     * Accepts {@code md} as alias of {@code markdown}. Returns canonical token or {@code null} if invalid.
     */
    public static String normalizeFormat(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String f = raw.trim().toLowerCase(Locale.ROOT);
        if ("md".equals(f) || "markdown".equals(f)) {
            return "markdown";
        }
        if ("json".equals(f)) {
            return "json";
        }
        if ("pdf".equals(f)) {
            return "pdf";
        }
        return null;
    }

    public static boolean isValidExportFormat(String raw) {
        return normalizeFormat(raw) != null;
    }
}
