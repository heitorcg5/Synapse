# AI_DEVELOPMENT_RULES.md

## Purpose

This document defines the rules that any AI agent (Cursor, Copilot, GPT,
Claude, etc.) must follow when generating code for this project.

The goal is to maintain:

-   Clean architecture
-   Modular structure
-   Maintainable code
-   Consistent conventions

These rules must **never be violated**.

------------------------------------------------------------------------

# 1. Architecture Rules

The project follows **Clean Architecture with a modular monolith
structure**.

Allowed dependency flow:

Controller → Service → Repository → Database

Forbidden:

Controller → Repository\
Controller → Entity\
Frontend → Database

------------------------------------------------------------------------

# 2. Backend Rules (Spring Boot)

### Controllers

Controllers must:

-   Only handle HTTP requests
-   Validate inputs
-   Call services
-   Return DTOs

Controllers **must not contain business logic**.

------------------------------------------------------------------------

### Services

Services contain business logic.

Responsibilities:

-   Orchestrate domain operations
-   Call repositories
-   Call AI services
-   Implement use cases

Services must not expose entities directly.

------------------------------------------------------------------------

### Repositories

Repositories:

-   Use Spring Data JPA
-   Only perform persistence operations
-   Contain no business logic

------------------------------------------------------------------------

### DTO Usage

DTOs must be used for:

-   Request bodies
-   API responses

Entities must never be returned by controllers.

------------------------------------------------------------------------

# 3. Module Isolation

Each module must be self-contained.

Example module structure:

module/ controller/ service/ repository/ entity/ dto/

Modules must not directly depend on internal classes of other modules.

Communication between modules must happen through services.

------------------------------------------------------------------------

# 4. Entity Design

Entities must:

-   Represent domain models
-   Be located in module/entity
-   Use UUID as primary key

Entities must not contain business logic unrelated to the domain.

------------------------------------------------------------------------

# 5. Naming Conventions

### Classes

Controllers:\
ContentController

Services:\
ContentService

Repositories:\
ContentRepository

DTOs:\
CreateContentRequest\
ContentResponse

------------------------------------------------------------------------

### Endpoints

Use REST naming conventions.

Examples:

POST /api/content\
GET /api/content/{id}\
DELETE /api/content/{id}

------------------------------------------------------------------------

# 6. Error Handling

All errors must be handled using:

@RestControllerAdvice

Standard error response:

{ "error": "ERROR_CODE", "message": "Human readable message" }

------------------------------------------------------------------------

# 7. Logging

Use:

SLF4J\
Logback

Rules:

-   Log errors
-   Log processing jobs
-   Never log passwords or tokens

------------------------------------------------------------------------

# 8. Frontend Rules (React)

Frontend must use **feature-based architecture**.

Structure:

features/ feature_name/ components/ pages/ hooks/ api/

Shared elements go in:

shared/

------------------------------------------------------------------------

### React Components

Components must:

-   Be small and reusable
-   Avoid complex logic
-   Use hooks for state management

------------------------------------------------------------------------

# 9. State Management

Allowed tools:

React Query\
Redux Toolkit

Avoid global state unless necessary.

------------------------------------------------------------------------

# 10. Code Quality

Code must follow:

Single Responsibility Principle\
Separation of Concerns\
Dependency Injection

Maximum recommended file sizes:

Component: \~200 lines\
Service: \~300 lines

------------------------------------------------------------------------

# 11. AI Code Generation Rules

When generating code:

1.  Respect the module structure.
2.  Do not create large monolithic services.
3.  Do not bypass service layers.
4.  Always create DTOs for APIs.
5.  Follow naming conventions.
6.  Keep code readable and maintainable.

------------------------------------------------------------------------

# 12. Pull Request Guidelines

Every change should:

-   Follow architecture rules
-   Not break module boundaries
-   Include tests when possible
-   Maintain consistent formatting

------------------------------------------------------------------------

# 13. Forbidden Practices

The following are strictly forbidden:

-   Business logic inside controllers
-   Direct database access from controllers
-   Returning entities directly in APIs
-   Large "god classes"
-   Cross-module tight coupling

------------------------------------------------------------------------

# 14. Expected Outcome

If these rules are followed, the system will be:

-   Modular
-   Scalable
-   Easy to maintain
-   AI-friendly for future development
