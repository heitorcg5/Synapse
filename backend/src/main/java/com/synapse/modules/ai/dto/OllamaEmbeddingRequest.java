package com.synapse.modules.ai.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OllamaEmbeddingRequest {
    private String model;
    private String prompt;
}
