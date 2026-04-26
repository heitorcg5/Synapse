package com.synapse.modules.inbox.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class SummaryResponse {

    private UUID id;
    private UUID inboxItemId;
    private String summaryText;
    private String model;
    private String language;
    private Instant createdAt;
}
