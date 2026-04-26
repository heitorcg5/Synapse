package com.synapse.modules.inbox.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
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
}
