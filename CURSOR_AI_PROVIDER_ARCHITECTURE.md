# CURSOR_AI_PROVIDER_ARCHITECTURE.md

## Purpose

This document instructs AI coding agents (Cursor, Copilot, etc.) to
refactor the project so that AI model usage is **provider‑agnostic**.
The system must support **local models via Ollama** while being easily
extensible to external APIs in the future.

Goals:

-   Decouple the backend from a specific AI provider
-   Allow switching between local models and external APIs
-   Keep the architecture modular and scalable

Current provider: Local LLM using Ollama + Llama3.

Future providers: OpenAI Claude Gemini

------------------------------------------------------------------------

# 1. Required Architecture

Controller ↓ ContentService ↓ AIService (interface) ↓ Provider
Implementation ↓ Model Runtime (Ollama / API)

Controllers must never call the model directly.

------------------------------------------------------------------------

# 2. Module Structure

modules/ ai/ service/ AiService.java

provider/ OllamaProvider.java ExternalApiProvider.java

client/ OllamaClient.java

dto/ AiRequest.java AiResponse.java

------------------------------------------------------------------------

# 3. AI Service Interface

``` java
public interface AiService {

    String summarize(String text);

    String classify(String text);

    String generateTags(String text);

}
```

All modules must use this interface instead of calling the model
directly.

------------------------------------------------------------------------

# 4. Ollama Provider

The Ollama provider must implement AiService.

Responsibilities:

-   Prepare prompts
-   Call Ollama API
-   Parse responses

Endpoint:

POST http://localhost:11434/api/generate

Example request:

{ "model": "llama3", "prompt": "Summarize the following text...",
"stream": false }

------------------------------------------------------------------------

# 5. Ollama Client

Create a dedicated HTTP client responsible for communicating with
Ollama.

Responsibilities:

-   Send prompt requests
-   Parse responses
-   Handle connection errors

This client must hide API details from the rest of the backend.

------------------------------------------------------------------------

# 6. Prompt Strategy

Example summarization prompt:

Summarize the following content in three concise paragraphs.

Content: {TEXT}

Example classification prompt:

Classify the following text into 3‑5 topics.

Content: {TEXT}

Return the result as JSON.

------------------------------------------------------------------------

# 7. Large Document Processing

Large documents must be processed using chunking.

Pipeline:

Document ↓ Split into chunks (1000‑2000 tokens) ↓ Process each chunk
with AI ↓ Merge intermediate summaries ↓ Generate final summary

------------------------------------------------------------------------

# 8. Dependency Injection

The provider must be injected through Spring configuration.

Example:

AiService → OllamaProvider

Future:

AiService → OpenAiProvider

Configuration example:

AI_PROVIDER=ollama

------------------------------------------------------------------------

# 9. Backend Processing Flow

User uploads content ↓ Content extracted ↓ Text cleaned ↓ Text chunked ↓
AiService.summarize() ↓ AiService.classify() ↓ Results stored in
database

------------------------------------------------------------------------

# 10. Expected Result

The system must:

-   Run Llama3 locally using Ollama
-   Support long document processing
-   Allow switching providers easily
-   Keep AI logic isolated from business logic
