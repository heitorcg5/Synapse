package com.synapse.modules.user.util;

import com.synapse.modules.user.entity.User;

import java.util.Locale;
import java.util.Set;

public final class UserKnowledgePreferences {

    private static final Set<String> STYLES = Set.of("tags", "folders", "graph");

    private UserKnowledgePreferences() {}

    public static String effectiveKnowledgeStyle(User user) {
        if (user == null || user.getKnowledgeStyle() == null || user.getKnowledgeStyle().isBlank()) {
            return "tags";
        }
        String s = user.getKnowledgeStyle().trim().toLowerCase(Locale.ROOT);
        return STYLES.contains(s) ? s : "tags";
    }

    public static boolean isAutoTaggingEnabled(User user) {
        if (user == null || user.getAutoTaggingEnabled() == null) {
            return true;
        }
        return Boolean.TRUE.equals(user.getAutoTaggingEnabled());
    }

    public static boolean isAutoLinkEnabled(User user) {
        return user != null && Boolean.TRUE.equals(user.getAutoLinkEnabled());
    }

    public static boolean isValidKnowledgeStyle(String style) {
        if (style == null || style.isBlank()) {
            return false;
        }
        return STYLES.contains(style.trim().toLowerCase(Locale.ROOT));
    }
}
