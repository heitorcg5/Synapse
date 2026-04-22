package com.synapse.modules.knowledge.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class KnowledgeGraphEdgeResponse {
    private UUID sourceItemId;
    private UUID targetItemId;
    private String relationType;
    private double confidence;
}
