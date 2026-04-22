package com.synapse.modules.knowledge.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateKnowledgeFolderRequest {

    @NotBlank
    @Size(max = 255)
    private String name;

    private UUID parentId;
}
