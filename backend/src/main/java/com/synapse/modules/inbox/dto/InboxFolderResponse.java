package com.synapse.modules.inbox.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class InboxFolderResponse {
    private UUID id;
    private String name;
}
