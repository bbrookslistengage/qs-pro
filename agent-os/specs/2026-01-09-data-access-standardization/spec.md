# Specification: Data Access Standardization

## Goal
Standardize data-access boundaries across web and API so all web HTTP flows through a single client + feature service modules, and the API shell-query module follows controller/service/repository-provider layering like auth/features.

## User Stories
- As a developer, I want a consistent data-access pattern so that new features don’t reintroduce ad-hoc HTTP/DB access and are easy to test.
- As an MCE embedded user, I want session-based requests to work reliably so that authentication and data fetching behave consistently in an iframe.
- As a backend maintainer, I want shell-query orchestration and DB access separated so that controllers stay thin and business logic is testable and reusable.

## Specific Requirements

**Web: Single HTTP client**
- All web HTTP requests to `/api/*` must route through `apps/web/src/services/api.ts`.
- `apps/web/src/services/api.ts` must be configured to always send cookies for same-origin `/api/*` calls (axios `withCredentials: true` by default).
- `apps/web/src/App.tsx` may initiate auth bootstrap/session checks but must do so via the shared client or a service module that uses it.
- Avoid per-request credentials flags except rare cases; if used, document the exception in code near the callsite.

**Web: Feature service modules**
- Add feature-oriented modules under `apps/web/src/services/` (e.g. `auth.ts`, `features.ts`, `metadata.ts`) that export typed functions.
- Service functions must return raw API DTOs (server response shapes) without UI mapping/normalization.
- Service functions must use the shared client from `apps/web/src/services/api.ts` and must not import or instantiate raw axios/fetch.

**Web: Hooks own mapping/normalization**
- Hooks remain responsible for mapping server DTOs into UI-friendly types (e.g., the existing mapping approach in `apps/web/src/features/editor-workspace/hooks/use-metadata.ts`).
- TanStack Query caching should key off stable query keys and cache raw DTO responses; mapping should happen via hook-level selectors or mapping functions, not in service modules.

**Web: Eliminate ad-hoc fetch/axios in production code**
- Replace `fetch()` calls in hooks/components with service module calls.
- Replace raw `axios` usage in `apps/web/src/App.tsx` with service module calls using the shared client.
- Verification/dev tooling pages may be exceptions but must be isolated to `apps/web/src/features/verification/*` and clearly labeled; prefer using the shared client even there.

**Web: CSRF header posture**
- Do not introduce automatic `x-csrf-token` header attachment until there is a clearly defined backend-issued and enforced CSRF contract.
  - Note: a guard exists at `apps/api/src/auth/csrf.guard.ts`, but the client contract for issuing/storing tokens is not yet standardized.

**Web: Tests for refactors**
- Update/add tests where patterns already exist (e.g., hook tests) to reflect the new service-module integration without changing user-visible behavior.
- Keep test scope minimal and focused on refactored modules.

**API: Shell-query repository boundary**
- Remove direct Drizzle usage from `apps/api/src/shell-query/shell-query.service.ts` by introducing a repository interface local to `apps/api/src/shell-query`.
- Implement a Drizzle-backed repository and inject it via a Nest provider token aligned with existing patterns (e.g., `provide: 'SHELL_QUERY_RUN_REPOSITORY'` + `useFactory`).
- Preserve RLS context requirements by keeping DB access executed within the existing RLS context mechanism.

**API: Move SSE orchestration out of controller**
- Move per-user SSE rate limiting and Redis subscription lifecycle management out of `apps/api/src/shell-query/shell-query.controller.ts` into a dedicated service/provider.
- The dedicated service/provider must expose a controller-friendly API that returns an RxJS `Observable` for SSE streaming.

**API: Preserve SSE protocol stability**
- Keep the SSE route shape `GET /api/runs/:runId/events`.
- Keep the Redis limit key format `sse-limit:${user.userId}` and limit value `5`.
- Keep the pubsub channel name format `run-status:${runId}`.
- Do not change endpoint contracts/responses/status codes as part of this standardization.

**API: Keep controller validation thin**
- Controller responsibilities remain request parsing/validation (Zod/guards), routing, and response formatting.
- Orchestration/business logic resides in services/providers; DB access resides in repositories.

## Definition of Done

**Web**
- All production code under `apps/web/src` routes `/api/*` calls through `apps/web/src/services/api.ts`.
- No direct `fetch()` or raw `axios` calls remain in hooks/components/pages (exceptions only in `apps/web/src/features/verification/*`).
- Feature service modules exist under `apps/web/src/services/` and return raw DTOs (no UI mapping).
- Feature hooks call service modules and own query keys + mapping/normalization.
- Existing tests for touched hooks/components are updated to match the new boundaries.

**API**
- `apps/api/src/shell-query` has a repository interface + injected implementation and no longer performs direct Drizzle queries inside services/controllers.
- SSE streaming lifecycle (rate limit + Redis subscription) is owned by a dedicated service/provider and the controller remains thin.
- SSE protocol stability preserved (route shape, keys, limits, channel names).

## Visual Design
No visual assets provided.

## Existing Code to Leverage

**Web shared client**
- `apps/web/src/services/api.ts` is the canonical axios client location and already centralizes response handling.
- Use this file as the sole HTTP entrypoint for `/api/*` calls.

**Web hook mapping pattern**
- `apps/web/src/features/editor-workspace/hooks/use-metadata.ts` demonstrates stable query keys and in-hook mapping/normalization.
- Preserve this “hook owns mapping” pattern while moving HTTP into service modules.

**API layering pattern**
- `apps/api/src/auth/` and `apps/api/src/features/` demonstrate controller/service/repository separation with injected repository tokens.
- Mirror these patterns for shell-query (tokens, injection, and responsibilities).

**Drizzle repository implementations**
- `packages/database/src/repositories/drizzle-repositories.ts` shows Drizzle repository class patterns used across modules.
- Use this as a reference for method naming and repository structure (even if shell-query stays API-local initially).

**RLS context management**
- `apps/api/src/database/rls-context.service.ts` defines how tenant/MID context is bound for DB operations.
- Preserve this behavior when moving shell-query DB access behind an injected repository.

## Out of Scope
- Changing endpoint contracts/responses/status codes.
- Changing auth flow behavior (including iframe OAuth/JWT handling).
- Adding new endpoints unless strictly required for standardization.
- Reworking worker behavior or queue semantics.
- UI redesign beyond replacing data-access plumbing.
