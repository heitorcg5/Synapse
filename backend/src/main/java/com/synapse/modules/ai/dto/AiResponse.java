package com.synapse.modules.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiResponse {

    private String text;       // e.g. summary
    private List<String> list; // e.g. tags or topics
}
