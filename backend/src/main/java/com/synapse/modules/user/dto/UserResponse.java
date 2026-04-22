package com.synapse.modules.user.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class UserResponse {

    private UUID id;
    private String email;
    private String displayName;
    private String preferredLanguage;
    private String preferredTheme;
    private String preferredTimezone;
    private String dateFormat;
    private String timeFormat;
    private String aiSummaryDetail;
    private String aiResponseLanguageMode;
    private String aiCustomResponseLanguage;
    private Boolean aiAutoProcessCapture;

    private String processingMode;
    private Boolean pipelineSummarize;
    private Boolean pipelineClassify;
    private Boolean pipelineGenerateTags;
    private Boolean pipelineDetectDuplicates;
    private Boolean pipelineSuggestConnections;
    private String aiChunkSizeTokens;

    /** tags | folders | graph — default knowledge navigation style (UI only). */
    private String knowledgeStyle;
    private Boolean autoTaggingEnabled;
    private Boolean autoLinkEnabled;

    /** forever | 30d | 90d */
    private String dataRetentionPolicy;

    /** markdown | json | pdf — default for knowledge downloads */
    private String knowledgeExportFormat;

    private Boolean notifyProcessingFinished;
    private Boolean notifyNewConnection;
    private Boolean notifyDuplicateDetected;

    private boolean hasAvatar;
    private Instant createdAt;
}
