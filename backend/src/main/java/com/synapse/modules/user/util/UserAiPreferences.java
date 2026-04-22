package com.synapse.modules.user.util;

import com.synapse.modules.ai.AiCallOptions;
import com.synapse.modules.ai.SummaryDetailLevel;
import com.synapse.modules.user.entity.User;

import java.util.Locale;

public final class UserAiPreferences {

    private UserAiPreferences() {}

    public static AiCallOptions aiCallOptions(User user, String contentLanguage, String acceptLanguageHeader) {
        String lang = resolveResponseLanguage(user, contentLanguage, acceptLanguageHeader);
        SummaryDetailLevel detail = SummaryDetailLevel.fromStored(user.getAiSummaryDetail());
        int chunkChars = UserProcessingPreferences.chunkSizeChars(user);
        return new AiCallOptions(lang, detail, chunkChars);
    }

    public static String resolveResponseLanguage(User user, String contentLanguage, String acceptLanguageHeader) {
        String mode = user.getAiResponseLanguageMode();
        if (mode == null || mode.isBlank() || "input".equalsIgnoreCase(mode)) {
            return normalizeLang(contentLanguage);
        }
        if ("ui".equalsIgnoreCase(mode)) {
            return parseAcceptLanguage(acceptLanguageHeader);
        }
        if ("custom".equalsIgnoreCase(mode)) {
            return normalizeLang(user.getAiCustomResponseLanguage());
        }
        return "en";
    }

    private static String normalizeLang(String code) {
        if (code == null || code.isBlank()) {
            return "en";
        }
        return code.toLowerCase(Locale.ROOT).startsWith("es") ? "es" : "en";
    }

    private static String parseAcceptLanguage(String acceptLanguageHeader) {
        if (acceptLanguageHeader == null || acceptLanguageHeader.isBlank()) {
            return "en";
        }
        String first = acceptLanguageHeader.split(",")[0].trim().toLowerCase(Locale.ROOT);
        return first.startsWith("es") ? "es" : "en";
    }
}
