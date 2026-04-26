package com.synapse.modules.inbox.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateInboxFolderRequest {

    @NotBlank
    @Size(max = 255)
    private String name;
}
