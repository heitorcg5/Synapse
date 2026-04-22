package com.synapse.modules.user.util;

import com.synapse.modules.user.entity.User;

public final class UserNotificationPreferences {

    private UserNotificationPreferences() {}

    /** Default true when unset. */
    public static boolean isNotifyProcessingFinished(User user) {
        if (user == null || user.getNotifyProcessingFinished() == null) {
            return true;
        }
        return Boolean.TRUE.equals(user.getNotifyProcessingFinished());
    }

    /** Default false when unset. */
    public static boolean isNotifyNewConnection(User user) {
        return user != null && Boolean.TRUE.equals(user.getNotifyNewConnection());
    }

    /** Default false when unset. */
    public static boolean isNotifyDuplicateDetected(User user) {
        return user != null && Boolean.TRUE.equals(user.getNotifyDuplicateDetected());
    }

    public static boolean effectiveNotifyProcessingFinished(User user) {
        return isNotifyProcessingFinished(user);
    }

    public static boolean effectiveNotifyNewConnection(User user) {
        return isNotifyNewConnection(user);
    }

    public static boolean effectiveNotifyDuplicateDetected(User user) {
        return isNotifyDuplicateDetected(user);
    }
}
