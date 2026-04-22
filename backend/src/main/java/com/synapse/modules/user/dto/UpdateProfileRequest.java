package com.synapse.modules.user.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {

    @Size(max = 120, message = "Display name must be at most 120 characters")
    private String displayName;

    /** Optional: "en" or "es" (omit to leave unchanged). */
    private String preferredLanguage;

    /** Optional: dark, light, or system. */
    @Size(max = 16, message = "preferredTheme must be at most 16 characters")
    private String preferredTheme;

    @Size(max = 64, message = "preferredTimezone must be at most 64 characters")
    private String preferredTimezone;

    /** Optional: iso, dmy, mdy. */
    @Size(max = 16, message = "dateFormat must be at most 16 characters")
    private String dateFormat;

    /** Optional: h24, h12. */
    @Size(max = 8, message = "timeFormat must be at most 8 characters")
    private String timeFormat;

    @Size(max = 16, message = "aiSummaryDetail invalid")
    private String aiSummaryDetail;

    @Size(max = 16, message = "aiResponseLanguageMode invalid")
    private String aiResponseLanguageMode;

    @Size(max = 10, message = "aiCustomResponseLanguage invalid")
    private String aiCustomResponseLanguage;

    private Boolean aiAutoProcessCapture;

    /** immediate | background | manual */
    @Size(max = 16, message = "processingMode invalid")
    private String processingMode;

    private Boolean pipelineSummarize;
    private Boolean pipelineClassify;
    private Boolean pipelineGenerateTags;
    private Boolean pipelineDetectDuplicates;
    private Boolean pipelineSuggestConnections;

    /** 500 | 1000 | 2000 */
    @Size(max = 8, message = "aiChunkSizeTokens invalid")
    private String aiChunkSizeTokens;

    /** tags | folders | graph */
    @Size(max = 16, message = "knowledgeStyle invalid")
    private String knowledgeStyle;

    private Boolean autoTaggingEnabled;
    private Boolean autoLinkEnabled;

    /** forever | 30d | 90d */
    @Size(max = 16, message = "dataRetentionPolicy invalid")
    private String dataRetentionPolicy;

    /** markdown | json | pdf */
    @Size(max = 16, message = "knowledgeExportFormat invalid")
    private String knowledgeExportFormat;

    private Boolean notifyProcessingFinished;
    private Boolean notifyNewConnection;
    private Boolean notifyDuplicateDetected;
}
