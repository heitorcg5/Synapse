package com.synapse.modules.content.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateContentFolderRequest {

    @NotBlank
    @Size(max = 255)
    private String name;
}
