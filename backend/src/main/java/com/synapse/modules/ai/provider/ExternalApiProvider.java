package com.synapse.modules.ai.provider;

import com.synapse.modules.ai.AiCallOptions;
import com.synapse.modules.ai.SummaryDetailLevel;
import com.synapse.modules.ai.service.AiService;
import com.synapse.modules.ai.service.AiService.TitleAndSummary;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConditionalOnProperty(name = "synapse.ai.provider", havingValue = "external")
@Slf4j
public class ExternalApiProvider implements AiService {

    @Override
    public String summarize(String text, AiCallOptions options) {
        log.warn("ExternalApiProvider not implemented; returning placeholder.");
        return "Summary not available (external provider not configured).";
    }

    @Override
    public String generateTitle(String text, AiCallOptions options) {
        log.warn("ExternalApiProvider not implemented; returning placeholder.");
        return "Title not available (external provider not configured).";
    }

    @Override
    public TitleAndSummary summarizeWithTitle(String text, AiCallOptions options) {
        log.warn("ExternalApiProvider not implemented; returning placeholder.");
        AiCallOptions opts = options != null ? options : new AiCallOptions("en", SummaryDetailLevel.MEDIUM);
        return new TitleAndSummary(fallbackTitle(opts.responseLanguage()), summarize(text, opts));
    }

    @Override
    public List<String> classify(String text, AiCallOptions options) {
        log.warn("ExternalApiProvider not implemented; returning placeholder.");
        return List.of("uncategorized");
    }

    @Override
    public List<String> generateTags(String text, AiCallOptions options) {
        return classify(text, options);
    }

    @Override
    public String getModelName() {
        return "external";
    }

    private static String fallbackTitle(String language) {
        return language != null && language.startsWith("es") ? "Título" : "Title";
    }
}
