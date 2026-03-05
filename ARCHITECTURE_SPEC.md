# AI Content Analyzer Platform - Architecture Specification

## 1. Project Overview

This project is a web platform that allows users to upload or provide
different types of content (videos, web pages, documents, audio, or
text). The system processes the content using AI models to:

-   Extract the main textual information
-   Generate summaries
-   Classify the content by topics
-   Store and manage the results for later access

The system is composed of:

-   Frontend: React
-   Backend: Java Spring Boot
-   Database: PostgreSQL
-   AI processing modules
-   Asynchronous processing pipeline

The architecture must follow industry best practices for scalability,
maintainability and modularity.

------------------------------------------------------------------------

# 2. High Level Architecture

The system uses a modular monolith architecture with clear separation of
concerns.

Frontend (React) ↓ REST API (Spring Boot) ↓ Application Services ↓
Domain Layer ↓ Repositories ↓ PostgreSQL

Content processing should be asynchronous:

Upload Content ↓ Create Processing Job ↓ Queue ↓ AI Processing Pipeline
↓ Store Results

------------------------------------------------------------------------

# 3. Backend Architecture (Spring Boot)

The backend must follow Clean Architecture principles.

Layers:

Controller Layer Application Layer (Services / Use Cases) Domain Layer
(Entities) Infrastructure Layer (Repositories, external services)

## 3.1 Backend Folder Structure

backend │ ├── config │ ├── common │ ├── exceptions │ ├── utils │ ├──
security │ └── constants │ ├── modules │ │ ├── auth │ │ ├── controller │
│ ├── service │ │ ├── repository │ │ ├── entity │ │ └── dto │ │ │ ├──
user │ │ ├── controller │ │ ├── service │ │ ├── repository │ │ ├──
entity │ │ └── dto │ │ │ ├── content │ │ ├── controller │ │ ├── service
│ │ ├── repository │ │ ├── entity │ │ └── dto │ │ │ ├── processing │ │
├── service │ │ ├── entity │ │ └── repository │ │ │ ├── summary │ │ │
├── classification │ │ │ └── ai │ └── Application.java

------------------------------------------------------------------------

# 4. Backend Coding Rules

## Controllers

Controllers must:

-   Only handle HTTP requests
-   Validate inputs
-   Call services
-   Return DTOs

Controllers must never contain business logic.

Flow:

Controller → Service → Repository

------------------------------------------------------------------------

## Services

Services contain business logic.

Responsibilities:

-   Process requests
-   Coordinate domain operations
-   Call repositories
-   Call AI services

Services must not expose database entities directly.

------------------------------------------------------------------------

## Repositories

Repositories interact with the database using Spring Data JPA.

Repositories must:

-   Only perform database operations
-   Contain no business logic

------------------------------------------------------------------------

## DTOs

DTOs must be used for:

-   API input
-   API responses

Entities must never be returned directly from controllers.

Example DTO types:

CreateContentRequest\
ContentResponse\
SummaryResponse\
UserProfileResponse

------------------------------------------------------------------------

# 5. Database Design

## Tables

### users

id (UUID)\
email\
password_hash\
created_at

### contents

id (UUID)\
user_id\
type (VIDEO, WEB, AUDIO, DOCUMENT, TEXT)\
source_url\
uploaded_at\
status

### analysis_results

id\
content_id\
raw_text\
language\
processed_at

### summaries

id\
content_id\
summary_text\
model\
created_at

### tags

id\
name

### content_tags

content_id\
tag_id

### processing_jobs

id\
content_id\
status\
step\
created_at\
updated_at

------------------------------------------------------------------------

# 6. AI Processing Pipeline

Content must be processed through a pipeline.

Content Upload\
↓\
Content Extraction\
↓\
Text Cleaning\
↓\
AI Analysis\
↓\
Topic Classification\
↓\
Summary Generation\
↓\
Store Results

Processing should be asynchronous.

Possible implementations:

-   Spring Async
-   RabbitMQ
-   Kafka

------------------------------------------------------------------------

# 7. REST API Design

## Content Endpoints

POST /api/content\
GET /api/content/{id}\
GET /api/content/user\
DELETE /api/content/{id}

## Processing

POST /api/content/{id}/analyze\
GET /api/content/{id}/summary\
GET /api/content/{id}/tags

## Authentication

POST /api/auth/login\
POST /api/auth/register\
POST /api/auth/refresh

Authentication uses JWT.

------------------------------------------------------------------------

# 8. Frontend Architecture (React)

Use feature-based architecture.

frontend │ ├── app │ ├── router │ └── store │ ├── features │ │ ├── auth
│ │ ├── api │ │ ├── components │ │ ├── hooks │ │ └── pages │ │ │ ├──
content │ │ ├── api │ │ ├── components │ │ ├── hooks │ │ └── pages │ │ │
├── summary │ └── classification │ ├── shared │ ├── components │ ├──
utils │ └── types │ └── i18n

------------------------------------------------------------------------

# 9. Frontend Best Practices

Use:

React\
React Query\
Axios\
Redux Toolkit (optional)

Guidelines:

-   Separate API calls from UI
-   Use reusable components
-   Avoid large components
-   Keep components under \~200 lines

------------------------------------------------------------------------

# 10. Error Handling

Backend must implement:

@RestControllerAdvice

Standard error format:

{ "error": "CONTENT_NOT_FOUND", "message": "Content with ID not found" }

------------------------------------------------------------------------

# 11. Logging

Use:

SLF4J\
Logback

Log:

-   Requests
-   Errors
-   Processing jobs

Never log sensitive data.

------------------------------------------------------------------------

# 12. Security

Use:

Spring Security\
JWT authentication\
BCrypt password hashing

Protect authenticated endpoints.

------------------------------------------------------------------------

# 13. Testing

Backend must include:

JUnit\
Mockito

Types:

Unit tests\
Service tests\
Integration tests

------------------------------------------------------------------------

# 14. Dev Environment

Use Docker with docker-compose.

Services:

frontend\
backend\
postgres\
redis (optional)

------------------------------------------------------------------------

# 15. Development Principles

Single Responsibility Principle\
Dependency Injection\
Separation of Concerns\
Modularity

------------------------------------------------------------------------

# 16. Expected Outcome

The resulting system must be:

-   Modular
-   Maintainable
-   Scalable
-   Easy to extend with new AI models
-   Easy to test
