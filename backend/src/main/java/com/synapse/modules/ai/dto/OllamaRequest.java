package com.synapse.modules.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OllamaRequest {

    private String model;
    private String prompt;
    private Boolean stream;
    private String system;
    private Map<String, Object> options;

    @JsonProperty("stream")
    public Boolean getStream() {
        return stream != null ? stream : false;
    }
}
