package com.synapse.modules.knowledge.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class AssignKnowledgeFolderRequest {
    /** Null clears folder assignment (root / uncategorized). */
    private UUID folderId;
}
