package com.synapse.modules.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiRequest {

    private String text;
    private String task; // e.g. "summarize", "classify", "generateTags"
}
