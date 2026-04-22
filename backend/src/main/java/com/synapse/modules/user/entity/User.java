package com.synapse.modules.user.entity;

import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "display_name", length = 120)
    private String displayName;

    @Column(name = "preferred_language", length = 10)
    private String preferredLanguage;

    /** UI theme: dark, light, or system (follow OS). */
    @Column(name = "preferred_theme", length = 16)
    private String preferredTheme;

    /** IANA timezone id, e.g. Europe/Madrid. */
    @Column(name = "preferred_timezone", length = 64)
    private String preferredTimezone;

    /** Date display: iso (yyyy-MM-dd), dmy, mdy. */
    @Column(name = "date_format", length = 16)
    private String dateFormat;

    /** Time display: h24 or h12. */
    @Column(name = "time_format", length = 8)
    private String timeFormat;

    /** AI: short | medium | detailed — summary length and model parameters. */
    @Column(name = "ai_summary_detail", length = 16)
    private String aiSummaryDetail;

    /** AI: input | ui | custom — how response language is chosen. */
    @Column(name = "ai_response_language_mode", length = 16)
    private String aiResponseLanguageMode;

    /** AI: when mode is custom, force "en" or "es". */
    @Column(name = "ai_custom_response_language", length = 10)
    private String aiCustomResponseLanguage;

    /** AI: if true, run full processing pipeline immediately after capture; if false, inbox only (process later). */
    @Column(name = "ai_auto_process_capture")
    private Boolean aiAutoProcessCapture;

    /** immediate | background | manual — when and how auto-processing runs (supersedes legacy auto flag when set). */
    @Column(name = "processing_mode", length = 16)
    private String processingMode;

    /** Pipeline step toggles (null = use default on). */
    @Column(name = "pipeline_summarize")
    private Boolean pipelineSummarize;

    @Column(name = "pipeline_classify")
    private Boolean pipelineClassify;

    @Column(name = "pipeline_generate_tags")
    private Boolean pipelineGenerateTags;

    @Column(name = "pipeline_detect_duplicates")
    private Boolean pipelineDetectDuplicates;

    @Column(name = "pipeline_suggest_connections")
    private Boolean pipelineSuggestConnections;

    /** Chunk tier for long text: 500, 1000, or 2000 (token-equivalent hints). */
    @Column(name = "ai_chunk_size_tokens", length = 8)
    private String aiChunkSizeTokens;

    /** Digital Brain: default UI layout — tags | folders | graph (stored data unchanged). */
    @Column(name = "knowledge_style", length = 16)
    private String knowledgeStyle;

    /** When false, pipeline does not assign AI-generated tags to captures. */
    @Column(name = "auto_tagging_enabled")
    private Boolean autoTaggingEnabled;

    /** When true, similarity-based links are stored in {@code knowledge_relations} after confirm. */
    @Column(name = "auto_link_enabled")
    private Boolean autoLinkEnabled;

    /**
     * Privacy: {@code forever} | {@code 30d} | {@code 90d} — inbox captures (and linked knowledge) older than
     * the window may be deleted by the retention scheduler (based on {@code contents.uploaded_at}).
     */
    @Column(name = "data_retention_policy", length = 16)
    private String dataRetentionPolicy;

    /** Default download format for knowledge exports: markdown | json | pdf. */
    @Column(name = "knowledge_export_format", length = 16)
    private String knowledgeExportFormat;

    /** In-app alerts: pipeline completed (default on when null). */
    @Column(name = "notify_processing_finished")
    private Boolean notifyProcessingFinished;

    /** In-app alerts: auto-linked knowledge (RELATED). */
    @Column(name = "notify_new_connection")
    private Boolean notifyNewConnection;

    /** In-app alerts: duplicate capture URL detected. */
    @Column(name = "notify_duplicate_detected")
    private Boolean notifyDuplicateDetected;

    /** Stored avatar bytes (JPEG, PNG, WebP or GIF). Lazy so GET /user/me does not load the blob. */
    @Basic(fetch = FetchType.LAZY)
    @Column(name = "profile_image", columnDefinition = "BYTEA")
    private byte[] profileImage;

    @Column(name = "profile_image_content_type", length = 64)
    private String profileImageContentType;

    /** Denormalized so GET /user/me does not need to load profile_image. */
    @Column(name = "has_profile_image")
    private Boolean hasProfileImage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
