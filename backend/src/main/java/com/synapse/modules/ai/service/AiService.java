package com.synapse.modules.ai.service;

import java.util.List;

/**
 * Provider-agnostic AI service interface. All modules must use this interface
 * instead of calling a specific model or provider directly.
 * Language (e.g. "en", "es") is used to generate responses in the user's language.
 */
public interface AiService {

    String summarize(String text, String language);

    List<String> classify(String text, String language);

    List<String> generateTags(String text, String language);

    /**
     * Model or provider name used for storage (e.g. in summaries table).
     */
    String getModelName();
}
