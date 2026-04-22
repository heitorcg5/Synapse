package com.synapse.modules.knowledge.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class KnowledgeGraphResponse {
    private List<KnowledgeGraphNodeResponse> nodes;
    private List<KnowledgeGraphEdgeResponse> edges;
}
