package com.synapse.modules.content.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "contents",
        indexes = {
                @Index(name = "idx_contents_user_uploaded_at", columnList = "user_id, uploaded_at"),
                @Index(name = "idx_contents_user_status_uploaded_at", columnList = "user_id, status, uploaded_at"),
                @Index(name = "idx_contents_user_source_url", columnList = "user_id, source_url"),
                @Index(name = "idx_contents_user_folder_uploaded_at", columnList = "user_id, folder_id, uploaded_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Content {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String type;

    @Column(name = "source_url")
    private String sourceUrl;

    /**
     * Captured raw text (Digital Brain inbox). Optional for link/video-only capture.
     */
    @Column(name = "raw_content", columnDefinition = "TEXT")
    private String rawContent;

    /**
     * Locale for AI and persisted knowledge (e.g. en, es).
     */
    @Column(length = 10)
    private String language;

    @Column
    private String title;

    @Column(name = "notifications_enabled")
    private Boolean notificationsEnabled;

    @Column(name = "notification_reminder_at", columnDefinition = "TIMESTAMPTZ")
    private Instant notificationReminderAt;

    @Column(name = "reminder_notified_at", columnDefinition = "TIMESTAMPTZ")
    private Instant reminderNotifiedAt;

    @Column(name = "folder_id")
    private UUID folderId;

    @Column(nullable = false)
    private String status;

    @Column(
            name = "uploaded_at",
            nullable = false,
            updatable = false,
            columnDefinition = "TIMESTAMPTZ"
    )
    private Instant uploadedAt;

    @PrePersist
    protected void onCreate() {
        if (uploadedAt == null) {
            uploadedAt = Instant.now();
        }
    }
}
