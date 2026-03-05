# IMPLEMENTATION_PLAN.md

## Phase 1 --- Project Setup

1.  Initialize repository
2.  Create folders:

backend/ frontend/ infra/

3.  Setup Spring Boot project
4.  Setup React project using Vite

------------------------------------------------------------------------

## Phase 2 --- Backend Foundation

Implement:

-   User module
-   Auth module
-   JWT security
-   PostgreSQL connection

Add entities:

User Content ProcessingJob

------------------------------------------------------------------------

## Phase 3 --- Core Content Module

Create:

ContentController ContentService ContentRepository

Endpoints:

POST /api/content GET /api/content/{id}

------------------------------------------------------------------------

## Phase 4 --- Processing Pipeline

Add processing service.

Steps:

1.  Content extraction
2.  Text cleaning
3.  AI analysis
4.  Topic classification
5.  Summary generation

Jobs should run asynchronously.

------------------------------------------------------------------------

## Phase 5 --- AI Integration

Create AI service layer.

Responsibilities:

-   Send text to AI model
-   Receive classification
-   Generate summary

------------------------------------------------------------------------

## Phase 6 --- Frontend

Implement pages:

Login Dashboard Upload Content Content Details Summary View

Use:

React Query Axios

------------------------------------------------------------------------

## Phase 7 --- Testing

Backend:

JUnit Mockito

Frontend:

React Testing Library

------------------------------------------------------------------------

## Phase 8 --- Docker

Create docker-compose:

services: backend frontend postgres
