# Product Tech Stack

## Frontend
- **Framework:** React 19
- **Build Tool:** Vite
- **Language:** TypeScript
- **Editor Engine:** Monaco Editor
- **State Management:** Zustand (with persistence middleware)
- **Data Fetching:** TanStack Query
- **UI/Styling:** Tailwind CSS ("Spectra Kinetic" Design System)
- **Icons:** Solar Icons (via @iconify/react)
- **Virtualization:** @tanstack/react-virtual (for Results Grid)

## Backend
- **Framework:** NestJS (Node.js)
- **Adapter:** Fastify Adapter
- **Queue/Job Management:** BullMQ (Redis)
- **Validation:** Zod
- **Libraries:** `jose` (JWT Verification)
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL 16
- **Architecture (CRITICAL):** 
    - **Repository Layer:** All database access MUST be abstracted through interfaces and concrete Repository classes. No raw Drizzle calls in services or controllers.
    - **Service Layer:** All business logic (OAuth, Encryption, Orchestration) MUST reside in Services.
    - **Controller Layer:** Responsibilities limited to request parsing, routing, and response formatting.

## Infrastructure & Architecture
- **Repository Structure:** Monorepo (pnpm workspaces)
- **Containerization:** Docker (for Redis & PostgreSQL)
- **Architecture Pattern:** Zero-Data Proxy / Shell Execution (Pass-through)
- **Cloud/Platform:** (Implied) Heroku or AWS

## Security
- **Encryption:** AES-256-GCM (for Refresh Tokens)
- **Compliance:** Content Security Policy (CSP) enforcement
- **Authentication:** OAuth 2.0 (MCE Integration)