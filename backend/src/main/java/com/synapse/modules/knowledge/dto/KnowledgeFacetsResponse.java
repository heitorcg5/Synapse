package com.synapse.modules.knowledge.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class KnowledgeFacetsResponse {
    private List<String> tags;
    private List<String> types;
}
