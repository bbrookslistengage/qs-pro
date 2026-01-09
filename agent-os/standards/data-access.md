# Data Access & Layering Standards

These standards define how QS Pro should structure data access end-to-end, from the frontend to the database and external integrations.

## Goals

- One obvious way to fetch and mutate data in the web app.
- Clear separation of concerns in the API (routing vs business logic vs persistence).
- Consistent testability (mock the API client in the web, mock repositories/providers in the API).
- Avoid leaking infrastructure concerns (DB, Redis, SFMC SOAP/REST) into UI or controllers.

## Frontend (React) Standards

### Layers

**Components → Hooks → API client → `/api/*`**

- **Components:** pure UI; no HTTP logic; accept props and callbacks.
- **Hooks:** own TanStack Query usage, query keys, request execution, mapping/normalization, and caching policy.
- **API client:** a single client with consistent behavior (credentials, auth refresh, error normalization).

### Server state: TanStack Query only

- Use TanStack Query for:
  - metadata fetching
  - execution runs, status streams, and results paging
  - feature flags / tenant settings
  - any server-backed UI data

- Hooks should export:
  - `queryKeys` constants
  - `fetch`/`mutate` functions
  - `useXyz()` hooks for components

### API client usage

- All web requests must go through `apps/web/src/services/api.ts`.
- Do not call `fetch()` or raw `axios` directly in components/hooks (except in tests/mocks).

## Backend (NestJS) Standards

### Layers

**Controller → Service → Repository / Provider**

- **Controller**
  - request validation (Zod or a standard validation mechanism)
  - auth guards
  - maps request → service call
  - maps service result → HTTP response (status codes, shape)
  - does *not* contain persistence logic or orchestration details

- **Service**
  - business logic and orchestration
  - transactions/workflow coordination (e.g. queue job enqueue + state updates)
  - does *not* call Drizzle directly; it depends on repositories/providers

- **Repository**
  - encapsulates DB access behind an interface (no Drizzle queries outside repositories)
  - receives a request-scoped DB (already running under RLS context)

- **Provider**
  - encapsulates non-DB dependencies (Redis, SFMC SOAP/REST calls, queue ops, etc.)
  - keeps integration policies together (timeouts, retries/backoff, error normalization)

### Repositories: interface + Drizzle implementation

- Define interfaces and shared types in `packages/database/src/interfaces`.
- Implement Drizzle repositories in `packages/database/src/repositories/drizzle-repositories.ts`.
- In Nest modules, inject repository implementations via tokens:
  - `provide: 'TENANT_REPOSITORY'`
  - `useFactory: (db) => new DrizzleTenantRepository(db)`

### RLS context

- All DB calls must run under the request-scoped RLS context established in the API bootstrap.
- Never rely on application-level filtering as the only tenant boundary.

## Practical rules of thumb

- If you can’t unit test a service without touching the database, it probably needs a repository boundary.
- If a controller is longer than a screen, it probably owns logic that should be in a service/provider.
- If multiple hooks call the same endpoint, add a feature service module and share the fetcher + query keys.

