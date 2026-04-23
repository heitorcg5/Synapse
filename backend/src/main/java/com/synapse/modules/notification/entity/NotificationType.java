package com.synapse.modules.notification.entity;

public enum NotificationType {
    /** AI pipeline completed for an inbox capture. */
    PROCESSING_FINISHED,
    /** Same source URL already exists for this user. */
    DUPLICATE_DETECTED,
    /** Auto-link created one or more RELATED edges between knowledge notes. */
    NEW_CONNECTION,
    /** User-scheduled reminder for a specific capture. */
    CONTENT_REMINDER
}
