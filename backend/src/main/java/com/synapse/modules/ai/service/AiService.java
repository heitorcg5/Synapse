package com.synapse.modules.ai.service;

import java.util.List;

/**
 * Provider-agnostic AI service interface. All modules must use this interface
 * instead of calling a specific model or provider directly.
 */
public interface AiService {

    String summarize(String text);

    List<String> classify(String text);

    List<String> generateTags(String text);

    /**
     * Model or provider name used for storage (e.g. in summaries table).
     */
    String getModelName();
}
