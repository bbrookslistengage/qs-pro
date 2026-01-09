# Data Access Standardization

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

