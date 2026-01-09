---
name: Data Access Standards
description: Standardize frontend data fetching (TanStack Query + single API client) and backend layering (controller/service/repository/provider). Use when adding or refactoring API calls, creating new hooks, wiring editor execution flows, or touching modules that currently mix layers (e.g. controllers doing orchestration or services doing raw DB queries).
---

## When to use this skill

- When adding a new frontend API call or endpoint integration
- When creating or refactoring TanStack Query hooks
- When you see ad-hoc `fetch()` or raw `axios` usage in UI/components/hooks
- When adding a new NestJS endpoint (controller/service/repo boundaries)
- When a service or controller is making raw Drizzle queries
- When integrating new providers (Redis, SFMC SOAP/REST, queues)

# Data Access Standards

Follow the project standard here:

- `agent-os/standards/data-access.md`
- `apps/web/README.md`

## Execution checklist

1. Frontend: create/extend a feature hook using TanStack Query query keys.
2. Frontend: route all HTTP calls through `apps/web/src/services/api.ts` (no ad-hoc `fetch`).
3. Backend: keep controllers thin; move orchestration into services/providers.
4. Backend: move DB access into repository implementations behind interfaces.
5. Add/update tests close to the changed layer (hook tests, service unit tests, controller e2e where applicable).

