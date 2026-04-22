package com.synapse.modules.content.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class ContentResponse {

    private UUID id;
    private UUID userId;
    private String type;
    private String sourceUrl;
    private String rawContent;
    private String language;
    private String title;
    private Boolean notificationsEnabled;
    private String status;
    private Instant uploadedAt;
}
