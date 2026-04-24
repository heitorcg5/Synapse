# Deployment Guide

## Runtime Requirements

- Java 17+
- Maven 3.9+
- Node.js 18+ (Node 20+ recommended)
- PostgreSQL 14+
- (Optional) Ollama runtime for local AI provider

## Backend Configuration

Main config file: `backend/src/main/resources/application.yml`

Important environment variables:

- `SERVER_PORT` (default `8080`)
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`
- `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `JWT_SECRET`, `JWT_EXPIRATION_MS`
- `CORS_ALLOWED_ORIGINS`
- `AI_PROVIDER` (default `ollama`)
- `OLLAMA_URL`, `OLLAMA_MODEL`

Backend base path is `/api`.

## Database

- Flyway is enabled and migration scripts are under:
  `backend/src/main/resources/db/migration`
- On startup, migrations are applied before app readiness.

## Build & Run

### Backend

```bash
cd backend
mvn clean package
mvn spring-boot:run
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Production build:

```bash
cd frontend
npm run build
```

## Frontend API Configuration

Frontend resolves API base URL from:

- `VITE_API_URL` if set
- fallback: `http://<current-host>:8080/api`

## Deployment Topology (recommended)

1. Deploy PostgreSQL.
2. Deploy backend service (Spring Boot) with env vars and DB connectivity.
3. Deploy frontend static bundle (Vite output) behind reverse proxy/CDN.
4. Route frontend-origin API calls to backend `/api`.

## Health/Validation Checklist

- Backend starts and Flyway migrations succeed.
- Auth endpoints (`/api/auth/login`, `/api/auth/register`) respond.
- Frontend can fetch `/api/user/me` after login.
- Content -> processing -> confirm -> knowledge flow works.
- Notification endpoints clear/read/list as expected.

