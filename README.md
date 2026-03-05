# Synapse – AI Content Analyzer Platform

Platform to upload and analyze content (video, web, documents, audio, text) using AI: extraction, topic classification, and summaries.

## Stack

- **Backend:** Java 17, Spring Boot 3, Spring Security, JWT, PostgreSQL, JPA
- **AI:** Llama 3 via Ollama (local, no API keys)
- **Frontend:** React 18, Vite, React Query, Axios, React Router
- **Infra:** Docker Compose (PostgreSQL, backend, frontend)

## Quick start

### With Docker

```bash
cd infra
docker compose up -d
```

- API: http://localhost:8080/api  
- App: http://localhost:5173 (or port configured for frontend container)

### Local development

1. **PostgreSQL:** run via Docker or install locally (DB: `synapse`, user/pass: `synapse`).

2. **Backend:**
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```
   Or set `POSTGRES_*` and optionally `JWT_SECRET` in the environment.

3. **Ollama (for AI):** Install and run Llama 3 locally:
   ```bash
   brew install ollama
   ollama serve
   ollama pull llama3
   ```
   Backend uses `http://localhost:11434` by default.

4. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Uses Vite proxy so API calls to `/api` go to the backend.

## API (base path `/api`)

- **Auth:** `POST /auth/login`, `POST /auth/register`
- **Content:** `POST /content`, `GET /content/user`, `GET /content/{id}`, `DELETE /content/{id}`, `GET /content/{id}/summary`, `GET /content/{id}/tags`

All content endpoints require `Authorization: Bearer <token>`.

## Project layout

- `backend/` – Spring Boot modular monolith (auth, user, content, processing, summary, ai)
- `frontend/` – React app (features: auth, content; shared: api client, types, components)
- `infra/` – Docker Compose and deployment config
- Root `.md` files – architecture, DB schema, implementation plan, AI dev rules

## Configuration

- **Backend:** `application.yml` and env vars: `POSTGRES_*`, `JWT_SECRET`.
- **AI (Ollama):** `OLLAMA_URL` (default `http://localhost:11434`), `OLLAMA_MODEL` (default `llama3`), `AI_CHUNK_SIZE` (chars per chunk, default `6000`). If Ollama is down, the app falls back to placeholder summary/tags.
- **Frontend:** `VITE_API_URL` (default `/api` for same-origin/proxy).
