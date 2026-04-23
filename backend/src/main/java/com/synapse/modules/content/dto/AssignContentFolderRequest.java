package com.synapse.modules.content.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class AssignContentFolderRequest {
    private UUID folderId;
}
