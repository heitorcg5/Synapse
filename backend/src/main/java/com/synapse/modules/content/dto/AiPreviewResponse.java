package com.synapse.modules.content.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiPreviewResponse {
    private String title;
    private String summaryText;
    private String language;
}

