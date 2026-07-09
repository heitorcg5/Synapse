package com.synapse.modules.inbox.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class InboxItemResponse {

    private UUID id;
    private UUID userId;
    private String type;
    private String sourceUrl;
    private String rawContent;
    private String language;
    private String title;
    private Boolean notificationsEnabled;
    private Instant notificationReminderAt;
    private UUID folderId;
    private String folderName;
    private String status;
    private Instant capturedAt;
    /** Truncated capture text for inbox list display (avoids large payloads). */
    private String contentPreview;
    /** Truncated AI summary suggestion before user confirmation (not final knowledge). */
    private String summaryPreview;
    /** AI-suggested tags assigned during processing (pre-confirmation). */
    private List<String> tags;
}
