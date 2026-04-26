package com.synapse.modules.ai.dto;

import lombok.Data;
import java.util.List;

@Data
public class OllamaEmbeddingResponse {
    private List<Float> embedding;
}
