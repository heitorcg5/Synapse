package com.synapse.modules.ai.client;

import com.synapse.modules.ai.dto.OllamaRequest;
import com.synapse.modules.ai.dto.OllamaResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/**
 * Client for Ollama local API. Sends prompts and receives responses from Llama 3.
 * Only active when synapse.ai.provider=ollama.
 */
@Component
@ConditionalOnProperty(name = "synapse.ai.provider", havingValue = "ollama", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class OllamaClient {

    private final RestTemplate restTemplate;

    @Value("${synapse.ai.ollama-url:http://localhost:11434}")
    private String baseUrl;

    @Value("${synapse.ai.model:llama3}")
    private String model;

    private static final String GENERATE_PATH = "/api/generate";

    /**
     * Send a prompt to Ollama and return the generated text (non-streaming).
     */
    public String generate(String prompt) {
        return generate(prompt, null);
    }

    /**
     * Send a prompt with optional system message.
     */
    public String generate(String prompt, String systemMessage) {
        String url = baseUrl.endsWith("/") ? baseUrl + GENERATE_PATH.substring(1) : baseUrl + GENERATE_PATH;
        OllamaRequest request = OllamaRequest.builder()
                .model(model)
                .prompt(prompt)
                .stream(false)
                .system(systemMessage)
                .build();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<OllamaRequest> entity = new HttpEntity<>(request, headers);

        try {
            ResponseEntity<OllamaResponse> response = restTemplate.postForEntity(url, entity, OllamaResponse.class);
            if (response.getBody() != null && response.getBody().getResponse() != null) {
                return response.getBody().getResponse().trim();
            }
            return "";
        } catch (Exception e) {
            log.error("Ollama generate failed: {}", e.getMessage());
            throw new OllamaException("Ollama request failed: " + e.getMessage(), e);
        }
    }
}
