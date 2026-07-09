package com.synapse.modules.inbox.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
public class ConfirmInboxItemRequest {

    // Editable by the user. Can be empty to keep the AI suggestion.
    private String title;

    @NotBlank(message = "summaryText is required")
    private String summaryText;

    private Boolean notificationsEnabled;

    /** Optional scheduled reminder date-time (required when notificationsEnabled=true). */
    private Instant reminderAt;

    /** Optional inbox folder assignment on confirm. */
    private UUID folderId;

    /** Optional content type override (VIDEO, WEB, AUDIO, DOCUMENT, TEXT). */
    @Pattern(regexp = "VIDEO|WEB|AUDIO|DOCUMENT|TEXT", message = "Type must be VIDEO, WEB, AUDIO, DOCUMENT, or TEXT")
    private String type;
}

