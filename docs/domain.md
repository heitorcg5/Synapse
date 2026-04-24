# Synapse Domain Model

## Core Concepts

### User

Represents an authenticated account with:

- credentials (`email`, `passwordHash`)
- profile (`displayName`, avatar)
- preferences (language/theme/timezone/date-time format)
- AI and pipeline preferences
- notification preferences
- privacy/export preferences

### Content (Inbox Capture)

Raw captured unit before/through processing:

- source (`sourceUrl`, `rawContent`, `type`)
- processing status (pending/processing/ready/failed/confirmed lifecycle)
- optional folder assignment
- optional reminder scheduling fields

### Summary

Persisted AI-generated or user-edited summary associated to content.

### Tag

Classification/topic labels attached to content. Used for filtering and downstream knowledge context.

### Knowledge Item

Structured note created/upserted from confirmed inbox content:

- title/body/summary/language
- source capture references (`inboxItemId`, source type)
- optional folder
- related notes/backlinks via relations

### Knowledge Relations

Links between knowledge items with relation type and confidence score to power graph/backlink views.

### Content Folder / Knowledge Folder

Folder structures used to classify content and/or knowledge views.
The codebase currently resolves folder names from both sources where needed for compatibility.

### Processing Job & Analysis Result

- `ProcessingJob`: tracks async pipeline state and steps.
- `AnalysisResult`: stores cleaned/extracted text used by AI pipeline.

### Notification

In-app event entities for:

- processing finished
- duplicate detected
- new connection
- scheduled content reminder

## Domain Flow Summary

1. User captures content into inbox.
2. Processing pipeline enriches content (title/summary/tags/classification).
3. User reviews and confirms AI output.
4. Knowledge item is created/updated from confirmed capture.
5. Notifications reflect async lifecycle and reminder events.

