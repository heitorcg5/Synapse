package com.synapse.modules.notification.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_type", nullable = false, length = 32)
    private NotificationType type;

    /** Inbox capture to open (processing / duplicate primary). */
    @Column(name = "inbox_item_id")
    private UUID inboxItemId;

    /** Other capture with same URL (duplicate). */
    @Column(name = "related_inbox_item_id")
    private UUID relatedInboxItemId;

    /** Knowledge note to open (new connection). */
    @Column(name = "knowledge_item_id")
    private UUID knowledgeItemId;

    @Column(name = "connection_count")
    private Integer connectionCount;

    @Column(name = "read_at", columnDefinition = "TIMESTAMPTZ")
    private Instant readAt;

    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
