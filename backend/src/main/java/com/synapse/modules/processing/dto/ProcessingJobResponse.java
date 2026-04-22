package com.synapse.modules.processing.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class ProcessingJobResponse {

    private UUID id;
    private UUID inboxItemId;
    private String status;
    private String step;
    private Instant createdAt;
    private Instant updatedAt;
}
