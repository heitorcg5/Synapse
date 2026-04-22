package com.synapse.modules.user.util;

import com.synapse.modules.user.entity.User;

import java.util.Locale;
import java.util.Set;

public final class UserPrivacyPreferences {

    private static final Set<String> RETENTION_POLICIES = Set.of("forever", "30d", "90d");

    private UserPrivacyPreferences() {}

    public static String effectiveDataRetentionPolicy(User user) {
        if (user == null || user.getDataRetentionPolicy() == null || user.getDataRetentionPolicy().isBlank()) {
            return "forever";
        }
        String p = user.getDataRetentionPolicy().trim().toLowerCase(Locale.ROOT);
        return RETENTION_POLICIES.contains(p) ? p : "forever";
    }

    public static boolean isValidDataRetentionPolicy(String policy) {
        if (policy == null || policy.isBlank()) {
            return false;
        }
        return RETENTION_POLICIES.contains(policy.trim().toLowerCase(Locale.ROOT));
    }
}
