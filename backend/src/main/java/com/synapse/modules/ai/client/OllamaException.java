package com.synapse.modules.ai.client;

/**
 * Thrown when communication with Ollama fails.
 */
public class OllamaException extends RuntimeException {

    public OllamaException(String message) {
        super(message);
    }

    public OllamaException(String message, Throwable cause) {
        super(message, cause);
    }
}
