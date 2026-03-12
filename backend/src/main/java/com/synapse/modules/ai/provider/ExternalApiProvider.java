package com.synapse.modules.ai.provider;

import com.synapse.modules.ai.service.AiService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Stub for future external API providers (OpenAI, Claude, Gemini).
 * Not active by default; enable via AI_PROVIDER=external when implemented.
 */
@Component
@ConditionalOnProperty(name = "synapse.ai.provider", havingValue = "external")
@Slf4j
public class ExternalApiProvider implements AiService {

    @Override
    public String summarize(String text) {
        log.warn("ExternalApiProvider not implemented; returning placeholder.");
        return "Summary not available (external provider not configured).";
    }

    @Override
    public List<String> classify(String text) {
        log.warn("ExternalApiProvider not implemented; returning placeholder.");
        return List.of("uncategorized");
    }

    @Override
    public List<String> generateTags(String text) {
        return classify(text);
    }

    @Override
    public String getModelName() {
        return "external";
    }
}
