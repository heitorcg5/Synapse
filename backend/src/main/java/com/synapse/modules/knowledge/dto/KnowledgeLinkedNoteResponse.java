package com.synapse.modules.knowledge.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class KnowledgeLinkedNoteResponse {
    private UUID knowledgeItemId;
    private String title;
    private String relationType;
    private double confidence;
}
