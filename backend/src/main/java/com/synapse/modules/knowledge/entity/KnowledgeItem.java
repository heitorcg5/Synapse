package com.synapse.modules.knowledge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Structured knowledge derived from an inbox capture (Digital Brain knowledge layer).
 */
@Entity
@Table(name = "knowledge_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KnowledgeItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /**
     * Source inbox row id (same as legacy {@code contents.id}).
     */
    @Column(name = "inbox_item_id", nullable = false, unique = true)
    private UUID inboxItemId;

    @Column
    private String title;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(length = 10)
    private String language;

    /** Capture type from source content (TEXT, VIDEO, WEB, …) when known. */
    @Column(name = "source_content_type", length = 32)
    private String sourceContentType;



    /** Optional folder for hierarchical organization (same row may have tags & relations). */
    @Column(name = "folder_id")
    private UUID folderId;

    @Column(
            name = "created_at",
            nullable = false,
            updatable = false,
            columnDefinition = "TIMESTAMPTZ"
    )
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
