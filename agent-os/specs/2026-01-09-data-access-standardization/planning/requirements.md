# Spec Requirements: Data Access Standardization

## Initial Description
Target architecture

  - Web: Components → feature hooks (TanStack Query) → single API client → /api/*
  - API: Controller → Service → Repository (DB) / Provider (external integrations)

Current issues to fix

  - Frontend mixes fetch() and raw axios calls (e.g. apps/web/src/features/editor-
    workspace/hooks/use-metadata.ts, apps/web/src/hooks/use-tenant-features.ts, apps/
    web/src/App.tsx) while apps/web/src/services/api.ts exists but isn’t consistently
    used.
  - Backend layering is consistent in auth/features modules (interface + injected
    Drizzle repos), but shell-query bypasses it (direct Drizzle in apps/api/src/shell-
    query/shell-query.service.ts) and controller contains orchestration logic (SSE rate
    limiting/Redis subscription).

Work to complete

  1. Frontend standardization

  - Create a consistent web API layer:
      - Keep using TanStack Query for server state.
      - Route all HTTP through apps/web/src/services/api.ts.
      - Add feature-oriented service modules (e.g. apps/web/src/services/metadata.ts,
        apps/web/src/services/features.ts, apps/web/src/services/auth.ts) that export
        typed functions.
  - Replace direct fetch()/raw axios usage with the shared client + service modules.
  - Ensure credentials/cookie auth works consistently (embedded iframe case included).
  - Update or add tests where patterns exist (hooks/unit tests).

  2. Backend standardization (shell-query)

  - Introduce repository boundaries consistent with auth/features:
      - Add interfaces (either in packages/database/src/interfaces or local to API, but
        be consistent) for shell-query DB access.
      - Implement Drizzle repository class and inject via Nest module provider token.
  - Move controller-owned orchestration (SSE rate limiting + Redis subscription
    management) into a service/provider where appropriate.
  - Remove db: any usage and keep controller validation thin (Zod/guards) and service
    business-focused.
  - Keep RLS context requirements intact.

  3. Definition of done

  - No ad-hoc fetch() or raw axios in components/hooks for production code; everything
    uses the standard client + feature service modules.
  - Shell-query module follows controller/service/repository/provider boundaries
    similarly to auth/features.
  - Tests updated/added for any refactor that changes public behavior.
  - Update docs if the standard process changes.

Useful references

  - Standard doc: agent-os/standards/data-access.md
  - Frontend standards: apps/web/README.md
  - Existing good backend patterns: apps/api/src/auth/*, apps/api/src/features/*,
    packages/database/src/repositories/drizzle-repositories.ts

Run the smallest relevant test commands for the touched areas (web/unit, api/unit),
and keep changes scoped to standardization.

I also added the documentation + skill:

  - apps/web/README.md:1 documents the frontend process (TanStack Query + single API
    client + component purity) and points to the canonical standard.
  - agent-os/standards/data-access.md:1 defines the cross-project layering standard
    (web + api) and the practical rules.
  - .claude/skills/data-access-standards/SKILL.md:1 adds a Claude skill to apply these
    standards during future work.

## Requirements Discussion

### First Round Questions

**Q1:** For the web “single API client”, should we standardize on `apps/web/src/services/api.ts` as the only HTTP entrypoint (including auth bootstrap calls currently in `apps/web/src/App.tsx`), or is `App.tsx` allowed to call it directly for initial session checks?
**Answer:** Yes—standardize on `apps/web/src/services/api.ts` as the single HTTP entrypoint, including auth bootstrap calls in `apps/web/src/App.tsx`. `App.tsx` can initiate the session check, but it should do so via `api` (or via `services/auth.ts` that uses `api`).

**Q2:** For cookie/session auth (including embedded iframe), should we standardize on cookies being sent reliably on every request?
**Answer:** Yes. Standard is “cookies always” for same-origin `/api/*` calls. For axios: set `withCredentials: true` on the shared client by default. Don’t rely on per-request flags except for rare, explicitly documented cases.

**Q3:** For CSRF, should the client automatically attach `x-csrf-token` for unsafe methods?
**Answer:** No, not until there is an established backend CSRF contract. Do not add CSRF headers automatically today. If/when CSRF is added, then attach it for `POST`/`PUT`/`PATCH`/`DELETE` and omit for `GET`, with a standardized token source.

**Q4:** Should web service modules return raw API DTOs or mapped UI types?
**Answer:** Prefer service modules return raw API DTOs, and hooks own mapping/normalization into UI types (as `use-metadata.ts` does today).

**Q5:** Should there be zero direct `fetch()` / raw `axios` usage in hooks/components?
**Answer:** Correct: no direct `fetch()`/raw `axios` in hooks/components—hooks call service functions which use the shared client. Exception: explicit dev-only tooling pages (like a verification page) can be non-standard but should be clearly labeled and isolated; still preferable to use the shared client.

**Q6:** For shell-query DB repository interfaces, should we place them in `packages/database` or locally in the API?
**Answer:** Start locally in `apps/api/src/shell-query` (API-owned) unless another backend package needs it. Align naming/injection style with existing tokens (e.g. `SHELL_QUERY_RUN_REPOSITORY`) and follow the `provide: 'TOKEN'` + `useFactory` pattern.

**Q7:** Should SSE orchestration move out of the controller into a dedicated service/provider? What must remain stable?
**Answer:** Yes—create a dedicated service/provider responsible for per-user SSE rate limiting (same keys and limits), Redis duplicate + subscribe/unsubscribe lifecycle, and converting pubsub messages to an RxJS `Observable`. Keep stable: limit key format `sse-limit:${user.userId}`, limit value (5), channel name `run-status:${runId}`, and the SSE route shape `GET /api/runs/:runId/events`.

**Q8:** What is explicitly out of scope?
**Answer:** Out of scope: changing endpoint contracts/responses/status codes; changing auth flow behavior (including iframe OAuth/JWT handling); adding new endpoints unless strictly required for standardization; reworking worker behavior or queue semantics; any UI redesign beyond replacing data-access plumbing.

### Existing Code to Reference

**Similar Features Identified:**
- Feature: Auth module patterns - Path: `apps/api/src/auth/`
- Feature: Features module patterns - Path: `apps/api/src/features/`
- Feature: Drizzle repository implementations - Path: `packages/database/src/repositories/drizzle-repositories.ts`
- Feature: Repo interfaces (existing patterns) - Path: `packages/database/src/interfaces/index.ts`
- Feature: Hook mapping + query keys pattern - Path: `apps/web/src/features/editor-workspace/hooks/use-metadata.ts`

### Follow-up Questions
No follow-up questions asked.

## Visual Assets

### Files Provided:
No visual assets provided.

## Requirements Summary

### Functional Requirements
- Web: Route all HTTP through `apps/web/src/services/api.ts` (including `apps/web/src/App.tsx` auth bootstrap), and introduce feature-oriented `apps/web/src/services/*.ts` modules that export typed functions returning raw API DTOs.
- Web: Hooks/components must not call `fetch()` or raw `axios`; they must call service functions that use the shared client. Dev-only verification tooling may be an exception but should be clearly isolated/labeled.
- Web: The shared axios client should send cookies consistently for same-origin `/api/*` calls via default `withCredentials: true`.
- API: Shell-query module must follow controller/service/repository/provider boundaries; eliminate direct Drizzle usage in `ShellQueryService` by introducing an injected repository.
- API: Move controller-owned SSE orchestration (rate limiting and Redis subscription lifecycle) into a dedicated service/provider while preserving key formats, limits, channel names, and route shape.

### Reusability Opportunities
- Model API repository interfaces + injected Drizzle implementations after `apps/api/src/auth/` and `apps/api/src/features/`, and `packages/database/src/repositories/drizzle-repositories.ts`.
- Preserve the `use-metadata.ts` pattern: stable query keys + server DTO caching; keep mapping in the hook.

### Scope Boundaries
**In Scope:**
- Data access plumbing refactor to conform to the target layering: web (components → hooks → single API client) and API (controller → service → repository/provider).
- Minimal test updates/additions where patterns exist for touched areas.

**Out of Scope:**
- Endpoint contract/status code changes.
- Auth flow behavior changes (iframe OAuth/JWT handling).
- Worker/queue semantics changes.
- UI redesign beyond replacing data access.

### Technical Considerations
- Web cookie posture: “cookies always” for same-origin `/api/*` via `withCredentials: true` on the shared axios client; avoid per-request flags except rare documented cases.
- CSRF: do not introduce `x-csrf-token` behavior until the backend provides and enforces a clear contract.
- SSE stability constraints: keep `sse-limit:${user.userId}`, limit=5, `run-status:${runId}`, and `GET /api/runs/:runId/events` unchanged.
- Shell-query RLS context must remain intact while moving DB access behind an injected repository.

