package com.synapse.modules.content.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class SummaryResponse {

    private UUID id;
    private UUID contentId;
    private String summaryText;
    private String model;
    private Instant createdAt;
}
