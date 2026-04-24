# Synapse System Architecture

## Stack Summary

- **Backend**: Spring Boot 3, Java 17, Spring Security (JWT), Spring Data JPA, Flyway, PostgreSQL
- **Frontend**: React 18, Vite, TypeScript, React Query, Axios, i18next, Tailwind
- **API base path**: `/api`

---

## Modules

## Backend Modules (`backend/src/main/java/com/synapse/modules`)

- **`auth`**
  - Endpoints for login/register.
  - Issues JWT tokens via `AuthService`.
- **`user`**
  - Profile and preference management.
  - Avatar upload/removal.
  - Export endpoints for knowledge.
  - Data-retention services/schedulers.
- **`content`**
  - Capture creation, lookup, delete.
  - AI preview/confirm entrypoints.
  - Content folders and content-folder assignment.
  - Summary and tags retrieval.
- **`inbox`**
  - Unified inbox listing (pending/processing/ready/failed as configured in service flow).
- **`processing`**
  - Async processing pipeline orchestration.
  - Job tracking and job list API.
- **`knowledge`**
  - Knowledge list/detail/facets/graph.
  - Knowledge folders and folder assignment.
  - Linking and export services.
- **`notification`**
  - Notification list/read/read-all/clear.
  - Scheduled content reminder notifier.
- **`summary`**
  - Persisted summary entity/repository.
- **`ai`**
  - AI abstraction (`AiService`) and provider implementations (Ollama/external).

## Frontend Modules (`frontend/src/features`)

- **`auth`**
  - Login and register pages + API wrapper.
- **`content`**
  - Capture page, content details, summary view.
  - AI review modal, modern date/time pickers.
  - Content API and hooks.
- **`brain`**
  - Inbox, Knowledge list/detail, processing visibility.
  - Knowledge download dialog and preview components.
- **`notifications`**
  - Header bell panel + notifications API.
- **`profile`**
  - Profile/preferences pages and avatar UI.
- **`settings`**
  - Global settings pages.

Supporting frontend layers:

- **`shared`**: reusable UI primitives, API client, shared types/utilities.
- **`app`**: router and auth context wiring.

---

## Responsibilities

### Backend Responsibilities

- Authenticate users and protect APIs with JWT.
- Persist content lifecycle from capture to confirmed knowledge.
- Run AI-based enrichment pipeline asynchronously.
- Maintain folder, tag, summary, and relation consistency.
- Emit and manage in-app notifications (including reminders).
- Enforce preference-driven behavior (language, processing mode, notifications, retention).

### Frontend Responsibilities

- Present capture/inbox/review/knowledge workflows.
- Manage authenticated API communication and cache state.
- Provide user-facing controls for preferences, folders, reminders, exports.
- Offer responsive, componentized UI with consistent design system.

---

## Data Flow

## Primary Flow: Capture -> Process -> Confirm -> Knowledge

1. **Capture**
   - Frontend `UploadContentPage` sends `POST /content`.
   - Backend stores `Content` and optional folder assignment.

2. **Processing Trigger**
   - User triggers processing (`POST /content/{id}/process`) or flow applies configured mode.
   - `ProcessingService` creates/updates `ProcessingJob` and marks state transitions.

3. **AI Enrichment**
   - Extraction (`WebContentExtractionService` / `YouTubeTranscriptService`).
   - Analysis result persists cleaned text.
   - AI provider generates title/summary/tags/classification.
   - Summary/tag rows are persisted.

4. **Review & Confirm**
   - Frontend opens `AiReviewModal`, calls `POST /content/{id}/ai-preview`.
   - User edits and confirms via `POST /content/{id}/confirm`.
   - Backend persists confirmation and upserts `KnowledgeItem`.

5. **Knowledge Consumption**
   - Frontend reads `/knowledge`, `/knowledge/{id}`, `/knowledge/facets`, `/knowledge/graph`.
   - Optional export from `/user/me/export*`.

6. **Notifications**
   - Backend emits processing/duplicate/connection/reminder notifications.
   - Frontend bell panel reads and mutates `/notifications*`.

## Secondary Flow: Preferences -> Behavioral Changes

- `PATCH /user/me` updates preferences.
- Processing mode, AI detail level, and notification flags alter runtime service behavior.
- Retention preferences are enforced by retention services/scheduler.

---

## Service Interactions

## Key Backend Interactions

- **`AuthService` -> `UserService` / `UserDetailsService` / `JwtService`**
  - Register/login and token issuance.

- **`ContentController` -> `ContentService` + `ProcessingService`**
  - Content CRUD/folder operations and preview/confirm/process actions.

- **`ProcessingService` -> `AiService` + `ContentRepository` + `SummaryRepository` + `TagRepository` + `KnowledgeService` + `NotificationService`**
  - Orchestrates pipeline and state updates across modules.

- **`KnowledgeService` -> Knowledge repositories + content repositories + `KnowledgeLinkingService`**
  - Maintains knowledge notes, folders, graph/backlinks, and compatibility with content folders.

- **`NotificationService` -> `UserNotificationRepository`**
  - Persists and mutates notification state.

- **`UserController` -> `UserService` + `KnowledgeExportService`**
  - Profile/preferences/avatar and export operations.

## Key Frontend Interactions

- **API clients** (`authApi`, `contentApi`, `brainApi`, `notificationsApi`, `userApi`)
  - Encapsulate backend endpoint calls.
- **React Query**
  - Handles caching, optimistic updates (e.g., notifications clear/read), and invalidation.
- **Auth context + Axios interceptor**
  - Injects bearer token and language headers.

---

## Persistence & Boundaries

- **Relational DB**: PostgreSQL
- **Migrations**: Flyway scripts under `backend/src/main/resources/db/migration`
- **JPA mode**: `ddl-auto=validate` (schema evolution via migrations)

Data ownership boundaries:

- `content` owns capture lifecycle.
- `knowledge` owns structured notes and relations.
- `notification` owns in-app event timeline.
- `user` owns account/preferences/privacy/export defaults.

---

## Security Boundary

- JWT-protected API except auth endpoints.
- Current-user resolution is centralized through `@CurrentUser` argument resolution.
- Errors are normalized in global exception handling with trace IDs for diagnostics.

