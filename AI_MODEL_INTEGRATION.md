# AI_MODEL_INTEGRATION.md

## Purpose

This document defines how the AI model must be integrated into the
platform. It is intended for AI coding agents (Cursor, Copilot, Claude
Code, etc.) so they can implement the AI layer consistently with the
architecture described in the other documents.

The AI model used in this project is:

Llama 3 running locally via Ollama.

This approach avoids token costs and external API dependencies.

------------------------------------------------------------------------

# 1. AI Architecture Overview

The AI system is implemented as an internal service in the backend.

Flow:

User Input ↓ Content Extraction ↓ Text Cleaning ↓ Text Chunking ↓ AI
Processing (Llama 3) ↓ Post-processing ↓ Store Results

Correct dependency flow:

Controller → Service → AI Service → Ollama API

------------------------------------------------------------------------

# 2. Local Model Runtime

The model runs using:

Ollama

Ollama exposes a local REST API.

Default endpoint:

http://localhost:11434

Main endpoint:

POST /api/generate

------------------------------------------------------------------------

# 3. Model Setup

Install Ollama.

Mac:

brew install ollama

Run the service:

ollama serve

Pull the model:

ollama pull llama3

Recommended version for development:

llama3:8b

------------------------------------------------------------------------

# 4. Backend AI Module Structure

The AI integration must be implemented in a dedicated module.

modules/ ai/ service/ AiService.java dto/ AiRequest.java AiResponse.java
client/ OllamaClient.java

------------------------------------------------------------------------

# 5. Ollama Client

Create a client responsible for communicating with Ollama.

Responsibilities:

-   Send prompts
-   Receive responses
-   Handle errors
-   Abstract API details

Example request:

{ "model": "llama3", "prompt": "Summarize the following text...",
"stream": false }

------------------------------------------------------------------------

# 6. AI Service Responsibilities

Responsibilities:

-   Prepare prompts
-   Call the Ollama client
-   Parse responses

Example methods:

summarizeText(text)

classifyContent(text)

generateTags(text)

------------------------------------------------------------------------

# 7. Text Chunking Strategy

Large texts must be divided before sending to the model.

Recommended chunk size:

1000--2000 tokens.

Processing flow:

Large Document ↓ Split into chunks ↓ Process each chunk ↓ Merge results
↓ Generate final summary

------------------------------------------------------------------------

# 8. Prompt Design

Example summarization prompt:

Summarize the following content in 3 concise paragraphs. Focus on the
main ideas.

Content: {TEXT}

Example classification prompt:

Analyze the following content and classify it into 3--5 topics.

Content: {TEXT}

Return topics as a JSON list.

------------------------------------------------------------------------

# 9. Storage of AI Results

Results must be stored in PostgreSQL.

Tables:

analysis_results summaries content_tags

------------------------------------------------------------------------

# 10. Asynchronous Processing

AI tasks must run asynchronously.

Flow:

Upload content ↓ Create processing job ↓ Worker processes AI tasks ↓
Store results

------------------------------------------------------------------------

# 11. Expected Outcome

After implementation the system must:

-   Run Llama 3 locally
-   Process long documents reliably
-   Avoid token limitations
-   Integrate cleanly with the backend architecture
