package com.synapse.modules.inbox.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class AssignInboxFolderRequest {
    private UUID folderId;
}
