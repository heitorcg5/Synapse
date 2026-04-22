package com.synapse.modules.knowledge.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class KnowledgeGraphNodeResponse {
    private UUID id;
    private String title;
}
