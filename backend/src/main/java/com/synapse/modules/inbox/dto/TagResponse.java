package com.synapse.modules.inbox.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class TagResponse {

    private UUID id;
    private String name;
}
