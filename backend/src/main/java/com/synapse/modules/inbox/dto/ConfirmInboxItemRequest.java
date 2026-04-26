package com.synapse.modules.inbox.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.Instant;

@Data
public class ConfirmInboxItemRequest {

    // Editable by the user. Can be empty to keep the AI suggestion.
    private String title;

    @NotBlank(message = "summaryText is required")
    private String summaryText;

    private Boolean notificationsEnabled;

    /** Optional scheduled reminder date-time (required when notificationsEnabled=true). */
    private Instant reminderAt;
}

