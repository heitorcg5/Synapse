package com.synapse.modules.content.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class CreateContentRequest {

    @NotBlank(message = "Type is required")
    @Pattern(regexp = "VIDEO|WEB|AUDIO|DOCUMENT|TEXT", message = "Type must be VIDEO, WEB, AUDIO, DOCUMENT, or TEXT")
    private String type;

    private String sourceUrl;

    /** Optional pasted text for frictionless inbox capture (TEXT type recommended). */
    private String rawContent;
}
