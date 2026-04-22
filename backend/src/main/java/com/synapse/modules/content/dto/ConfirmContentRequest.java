package com.synapse.modules.content.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ConfirmContentRequest {

    // Editable by the user. Can be empty to keep the AI suggestion.
    private String title;

    @NotBlank(message = "summaryText is required")
    private String summaryText;

    private Boolean notificationsEnabled;
}

