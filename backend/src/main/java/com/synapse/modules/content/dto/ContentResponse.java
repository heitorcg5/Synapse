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
    private String status;
    private Instant uploadedAt;
}
