package com.synapse.modules.knowledge.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class KnowledgeFolderResponse {
    private UUID id;
    private UUID parentId;
    private String name;
}
