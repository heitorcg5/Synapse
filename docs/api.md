# Synapse API Documentation

Base URL: `/api`

## Authentication & Error Model

### Authentication requirements

- **Public endpoints**: `/auth/login`, `/auth/register`
- **All other endpoints**: require `Authorization: Bearer <jwt>`

### Standard error response

Most error responses follow:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable message",
  "traceId": "uuid"
}
```

### Global error codes

- `400 BAD_REQUEST` → `BAD_REQUEST` (IllegalArgumentException)
- `400 BAD_REQUEST` → `VALIDATION_ERROR` (bean validation failures)
- `401 UNAUTHORIZED` → `INVALID_CREDENTIALS` (bad login credentials)
- `404 NOT_FOUND` → module-specific code (e.g. `USER_NOT_FOUND`, `KNOWLEDGE_NOT_FOUND`)
- `500 INTERNAL_SERVER_ERROR` → `DATABASE_ERROR` (data layer failures)
- `500 INTERNAL_SERVER_ERROR` → `INTERNAL_ERROR` (unexpected exceptions)

---

## Auth Controller (`/auth`)

### `POST /auth/login`

- **Method**: `POST`
- **Request body** (`LoginRequest`):
  - `email` (required)
  - `password` (required)
- **Response** (`AuthResponse`, `200 OK`):
  - `accessToken`
  - `tokenType`
  - `expiresIn`
- **Auth required**: No
- **Error codes**:
  - `400 VALIDATION_ERROR` (missing fields)
  - `401 INVALID_CREDENTIALS`
  - `500 INTERNAL_ERROR`

### `POST /auth/register`

- **Method**: `POST`
- **Request body** (`RegisterRequest`):
  - `email` (required, valid email)
  - `password` (required, min 8 chars)
- **Response** (`AuthResponse`, `201 Created`)
- **Auth required**: No
- **Error codes**:
  - `400 VALIDATION_ERROR`
  - `400 BAD_REQUEST` (`Email already registered`)
  - `500 INTERNAL_ERROR`

---

## Inbox Controller (`/inbox`)

### `GET /inbox`

- **Method**: `GET`
- **Request body**: none
- **Response** (`List<ContentResponse>`, `200 OK`)
- **Auth required**: Yes
- **Error codes**:
  - `401 Unauthorized` (missing/invalid token)
  - `500 INTERNAL_ERROR`

---

## Content Controller (`/content`)

### `POST /content`

- **Method**: `POST`
- **Request body** (`CreateContentRequest`):
  - `type` (required: `VIDEO|WEB|AUDIO|DOCUMENT|TEXT`)
  - `sourceUrl` (optional)
  - `rawContent` (optional)
  - `folderId` (optional UUID)
- **Response** (`ContentResponse`, `201 Created`)
- **Auth required**: Yes
- **Error codes**:
  - `400 VALIDATION_ERROR`
  - `400 BAD_REQUEST` (invalid folder/type/domain rule)
  - `401 Unauthorized`
  - `500 INTERNAL_ERROR`

### `POST /content/{id}/ai-preview`

- **Method**: `POST`
- **Request body**: none
- **Response** (`AiPreviewResponse`, `200 OK`)
- **Auth required**: Yes
- **Error codes**:
  - `400 BAD_REQUEST` (invalid content/user)
  - `401 Unauthorized`
  - `404 NOT_FOUND` (content not found)
  - `500 INTERNAL_ERROR`

### `POST /content/{id}/confirm`

- **Method**: `POST`
- **Request body** (`ConfirmContentRequest`):
  - `title` (optional)
  - `summaryText` (required)
  - `notificationsEnabled` (optional boolean)
  - `reminderAt` (required when notifications enabled, must be future instant)
- **Response** (`ContentResponse`, `200 OK`)
- **Auth required**: Yes
- **Error codes**:
  - `400 VALIDATION_ERROR`
  - `400 BAD_REQUEST` (invalid reminder/content state)
  - `401 Unauthorized`
  - `404 NOT_FOUND`
  - `500 INTERNAL_ERROR`

### `POST /content/{id}/process`

- **Method**: `POST`
- **Request body**: none
- **Response**: empty (`202 Accepted`)
- **Auth required**: Yes
- **Error codes**:
  - `400 BAD_REQUEST` (status/state rules)
  - `401 Unauthorized`
  - `404 NOT_FOUND`
  - `500 INTERNAL_ERROR`

### `GET /content/{id}`

- **Method**: `GET`
- **Request body**: none
- **Response** (`ContentResponse`, `200 OK`)
- **Auth required**: Yes
- **Error codes**: `401`, `404`, `500`

### `GET /content/user`

- **Method**: `GET`
- **Request body**: none
- **Response** (`List<ContentResponse>`, `200 OK`)
- **Auth required**: Yes
- **Error codes**: `401`, `500`

### `GET /content/folders`

- **Method**: `GET`
- **Request body**: none
- **Response** (`List<ContentFolderResponse>`, `200 OK`)
- **Auth required**: Yes
- **Error codes**: `401`, `500`

### `POST /content/folders`

- **Method**: `POST`
- **Request body** (`CreateContentFolderRequest`):
  - `name` (required, max 255)
- **Response** (`ContentFolderResponse`, `201 Created`)
- **Auth required**: Yes
- **Error codes**:
  - `400 VALIDATION_ERROR`
  - `400 BAD_REQUEST` (invalid/empty name)
  - `401`
  - `500`

### `DELETE /content/{id}`

- **Method**: `DELETE`
- **Request body**: none
- **Response**: empty (`204 No Content`)
- **Auth required**: Yes
- **Error codes**: `401`, `404`, `500`

### `PATCH /content/{id}/folder`

- **Method**: `PATCH`
- **Request body** (`AssignContentFolderRequest`):
  - `folderId` (UUID or null)
- **Response** (`ContentResponse`, `200 OK`)
- **Auth required**: Yes
- **Error codes**:
  - `400 BAD_REQUEST` (folder not found)
  - `401`
  - `404`
  - `500`

### `GET /content/{id}/summary`

- **Method**: `GET`
- **Request body**: none
- **Response** (`SummaryResponse`, `200 OK`)
- **Auth required**: Yes
- **Error codes**: `401`, `404`, `500`

### `GET /content/{id}/tags`

- **Method**: `GET`
- **Request body**: none
- **Response** (`List<TagResponse>`, `200 OK`)
- **Auth required**: Yes
- **Error codes**: `401`, `404`, `500`

---

## Knowledge Controller (`/knowledge`)

### `GET /knowledge`

- **Method**: `GET`
- **Request body**: none
- **Query params**:
  - `from` (ISO date, optional)
  - `to` (ISO date, optional)
  - `type` (optional)
  - `tag` (optional)
  - `sort` (optional)
- **Headers**:
  - `X-Synapse-Timezone` (optional)
- **Response** (`List<KnowledgeItemResponse>`, `200 OK`)
- **Auth required**: Yes
- **Error codes**: `401`, `500`

### `GET /knowledge/facets`

- **Method**: `GET`
- **Request body**: none
- **Response** (`KnowledgeFacetsResponse`, `200 OK`)
- **Auth required**: Yes
- **Error codes**: `401`, `500`

### `GET /knowledge/graph`

- **Method**: `GET`
- **Request body**: none
- **Response** (`KnowledgeGraphResponse`, `200 OK`)
- **Auth required**: Yes
- **Error codes**: `401`, `500`

### `GET /knowledge/folders`

- **Method**: `GET`
- **Request body**: none
- **Response** (`List<KnowledgeFolderResponse>`, `200 OK`)
- **Auth required**: Yes
- **Error codes**: `401`, `500`

### `POST /knowledge/folders`

- **Method**: `POST`
- **Request body** (`CreateKnowledgeFolderRequest`):
  - `name` (required, max 255)
  - `parentId` (optional UUID)
- **Response** (`KnowledgeFolderResponse`, `201 Created`)
- **Auth required**: Yes
- **Error codes**:
  - `400 VALIDATION_ERROR`
  - `400 BAD_REQUEST` (parent not found/name invalid)
  - `401`
  - `500`

### `GET /knowledge/{id}`

- **Method**: `GET`
- **Request body**: none
- **Response** (`KnowledgeItemResponse`, `200 OK`)
- **Auth required**: Yes
- **Error codes**: `401`, `404` (`KNOWLEDGE_NOT_FOUND`), `500`

### `PATCH /knowledge/{id}/folder`

- **Method**: `PATCH`
- **Request body** (`AssignKnowledgeFolderRequest`):
  - `folderId` (UUID or null)
- **Response** (`KnowledgeItemResponse`, `200 OK`)
- **Auth required**: Yes
- **Error codes**:
  - `400 BAD_REQUEST` (folder not found)
  - `401`
  - `404` (`KNOWLEDGE_NOT_FOUND`)
  - `500`

---

## Notification Controller (`/notifications`)

### `GET /notifications/unread-count`

- **Method**: `GET`
- **Request body**: none
- **Response** (`UnreadCountResponse`, `200 OK`)
- **Auth required**: Yes
- **Error codes**: `401`, `500`

### `GET /notifications`

- **Method**: `GET`
- **Request body**: none
- **Response** (`List<NotificationResponse>`, `200 OK`)
- **Auth required**: Yes
- **Error codes**: `401`, `500`

### `PATCH /notifications/{id}/read`

- **Method**: `PATCH`
- **Request body**: none
- **Response**: empty (`204 No Content`)
- **Auth required**: Yes
- **Error codes**: `401`, `404` (`NOTIFICATION_NOT_FOUND`), `500`

### `PATCH /notifications/read-all`

- **Method**: `PATCH`
- **Request body**: none
- **Response**: empty (`204 No Content`)
- **Auth required**: Yes
- **Error codes**: `401`, `500`

### `DELETE /notifications`

- **Method**: `DELETE`
- **Request body**: none
- **Response**: empty (`204 No Content`)
- **Auth required**: Yes
- **Error codes**: `401`, `500`

### `POST /notifications/clear`

- **Method**: `POST`
- **Request body**: none
- **Response**: empty (`204 No Content`)
- **Auth required**: Yes
- **Error codes**: `401`, `500`

---

## Processing Controller (`/processing`)

### `GET /processing/jobs`

- **Method**: `GET`
- **Request body**: none
- **Response** (`List<ProcessingJobResponse>`, `200 OK`)
- **Auth required**: Yes
- **Error codes**: `401`, `500`

---

## User Controller (`/user`)

### `GET /user/me`

- **Method**: `GET`
- **Request body**: none
- **Response** (`UserResponse`, `200 OK`)
- **Auth required**: Yes
- **Error codes**: `401`, `404` (`USER_NOT_FOUND`), `500`

### `PATCH /user/me`

- **Method**: `PATCH`
- **Request body** (`UpdateProfileRequest`)
  - optional profile, locale, theme, pipeline, privacy and notification preference fields
- **Response** (`UserResponse`, `200 OK`)
- **Auth required**: Yes
- **Error codes**:
  - `400 VALIDATION_ERROR`
  - `400 BAD_REQUEST` (invalid enum/value)
  - `401`
  - `404`
  - `500`

### `GET /user/me/export`

- **Method**: `GET`
- **Request body**: none
- **Query params**:
  - `format` (optional: `markdown|json|pdf`)
- **Response** (`200 OK`, `application/*`, file bytes attachment)
- **Auth required**: Yes
- **Error codes**:
  - `400 BAD_REQUEST` (invalid format)
  - `401`
  - `404` (`USER_NOT_FOUND`)
  - `500`

### `GET /user/me/export/knowledge/{knowledgeItemId}`

- **Method**: `GET`
- **Request body**: none
- **Query params**:
  - `format` (optional: `markdown|json|pdf`)
- **Response** (`200 OK`, file bytes attachment)
- **Auth required**: Yes
- **Error codes**:
  - `400 BAD_REQUEST` (invalid format)
  - `401`
  - `404` (user/item not found depending on service path)
  - `500`

### `GET /user/me/avatar`

- **Method**: `GET`
- **Request body**: none
- **Response**:
  - `200 OK` with avatar bytes and image content-type, or
  - `404 Not Found` when avatar is missing
- **Auth required**: Yes
- **Error codes**: `401`, `404`, `500`

### `POST /user/me/avatar`

- **Method**: `POST` (`multipart/form-data`)
- **Request body**:
  - `file` (required image; JPEG/PNG/WebP/GIF; max 2MB)
- **Response** (`UserResponse`, `200 OK`)
- **Auth required**: Yes
- **Error codes**:
  - `400 BAD_REQUEST` (invalid file/type/size)
  - `401`
  - `404`
  - `500`

### `DELETE /user/me/avatar`

- **Method**: `DELETE`
- **Request body**: none
- **Response** (`UserResponse`, `200 OK`)
- **Auth required**: Yes
- **Error codes**: `401`, `404`, `500`

