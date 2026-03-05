package com.synapse.modules.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class OllamaResponse {

    private String model;

    @JsonProperty("response")
    private String response;

    @JsonProperty("done")
    private Boolean done;

    @JsonProperty("done_reason")
    private String doneReason;
}
