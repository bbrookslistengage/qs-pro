# Product Tech Stack

## Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Language:** TypeScript (strict mode)
- **Editor Engine:** Monaco Editor
- **State Management:** Zustand (global UI state)
- **Data Fetching:** TanStack Query (server state)
- **UI Components:** Radix UI (primitives)
- **Styling:** Tailwind CSS
- **Icons:** Solar Icons (via @iconify/react)
- **Virtualization:** @tanstack/react-virtual (for Results Grid)

## Backend
- **Framework:** NestJS 11
- **HTTP Adapter:** Fastify 5
- **Language:** TypeScript (strict mode)
- **Queue/Job Management:** BullMQ (Redis-backed)
- **Validation:** Zod
- **JWT:** `jose` (JWT verification for MCE tokens)
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL 16
- **Real-time:** Server-Sent Events (SSE) for job status updates
- **Architecture (CRITICAL):**
    - **Repository Layer:** All database access abstracted through interfaces and concrete Repository classes. No raw Drizzle calls in services or controllers.
    - **Service Layer:** All business logic (OAuth, Encryption, Orchestration) resides in Services.
    - **Controller Layer:** Responsibilities limited to request parsing, routing, and response formatting.

## Worker Service
- **Queue Processor:** BullMQ Worker
- **Scheduling:** @nestjs/schedule (cron jobs for asset cleanup)
- **Admin UI:** Bull Board (at `/admin/queues`)
- **Metrics:** Prometheus-compatible (at `/metrics`)
  - `shell_query_jobs_total` — Jobs by status
  - `shell_query_duration_seconds` — Job duration histogram
  - `shell_query_failures_total` — Failures by error type
  - `shell_query_active_jobs` — Currently processing gauge

## Infrastructure
- **Repository Structure:** pnpm monorepo
- **Containerization:** Docker (Redis & PostgreSQL for local dev)
- **Architecture Pattern:** Zero-Data Proxy / Shell Execution (pass-through)
- **Cloud/Platform:** TBD (Heroku, Railway, or AWS)

## Security
- **Encryption at Rest:** AES-256-GCM (for OAuth refresh tokens)
- **Encryption in Transit:** TLS (via reverse proxy/load balancer)
- **Database Isolation:** PostgreSQL Row-Level Security (RLS) with `app.tenant_id` and `app.mid` context
- **Session Management:** @fastify/secure-session (encrypted cookies)
- **Authentication:** OAuth 2.0 (delegated to MCE), JWT verification for App Switcher flow
- **Compliance:** Content Security Policy (CSP) — Pre-Launch

## Observability (Current & Planned)
- **Queue Monitoring:** Bull Board (implemented)
- **Metrics:** Prometheus (implemented)
- **Error Tracking:** Sentry (planned)
- **Tracing:** OpenTelemetry (planned)
- **Product Analytics:** PostHog (recommended)
