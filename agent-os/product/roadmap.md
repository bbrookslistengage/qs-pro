# Product Roadmap

This roadmap outlines the development phases for Query++ (QS Pro), progressing from core IDE functionality through enterprise features to a production-ready AppExchange listing.

**Key Principle:** Security and observability infrastructure is built in Phase 1 so that all subsequent features are instrumented from the start—no painful retrofits.

## How to Read This

- This roadmap is intentionally high-level; each item should be “spec-able” without fully defining all epic details here.
- Items include key constraints and “already implemented” notes so we don’t re-plan work that’s already done.
- **Sizing:** `S` = Small (1-2 days), `M` = Medium (3-5 days), `L` = Large (1-2 weeks)

---

## Phase 1: Core Product & Foundational Infrastructure

The foundation phase establishes the core product AND the infrastructure patterns that all future features will use. This includes audit logging, observability, validation patterns, and usage tracking—built once, used everywhere.

### Completed

- [x] **Project Foundation & Monorepo Setup** — Initialize project, Docker (Redis/Postgres), and implement the Tenant-Aware Repository pattern with Drizzle ORM. `S`
- [x] **Authentication & Token Wallet** — Implement App Switcher (JWT) SSO flow, Web App OAuth handshake, and the secure "Token Wallet" for encrypted refresh tokens. `M`
- [x] **Enhanced Package App Login Flow** — Refactor App Switcher login to use iframe GET + OAuth authorization code + `v2/userinfo` for enhanced packages, with proper session cookies. `S`
- [x] **Enhanced Package OAuth Documentation & Regression Tests** — Document the MCE iframe OAuth flow and add tests that assert `v2/userinfo` mapping and callback behavior. `S`
- [x] **MCE Bridge & Metadata Discovery** — Build the "Bridge" utility (auto-signing, TSSD resolution) and implement discovery for folders, DEs, and field definitions. `M`
- [x] **Sidebar & Schema Explorer (Frontend)** — Primary sidebar with lazy-loaded metadata for Data Extensions, folders, and schema. `M`
- [x] **Sidebar DE Search (Frontend)** — Search for DEs in the sidebar using the metadata cache. `S`
- [x] **Database Row Level Security (RLS)** — Tenant/BU isolation with Postgres RLS policies + per-request context binding. `M`
- [x] **Feature Flag Infrastructure** — Tier-based feature gating with `FeatureGate` component, `useFeature` hook, and per-tenant overrides. `M`
- [x] **Editor Guardrails & Autocomplete v1** — Monaco editor with modular SQL linting (MCE-aligned), contextual autocomplete, inline suggestions, and tests. `L`
  - Authoritative reference: `apps/web/src/features/editor-workspace/utils/sql-lint/MCE-SQL-REFERENCE.md`

### Core Product Features (Next)

- [x] **Shell Query Engine (Backend)** — BullMQ worker for "Shell Query" orchestration, asset recycling (shell/temp DEs), and pass-through results access. `L`
  - API endpoints exist: `POST /api/runs`, `GET /api/runs/:runId/events` (SSE), `GET /api/runs/:runId/results`
  - Rate limiting exists: per-user concurrent run cap + per-user SSE connection cap
  - Embedded requirement: `Secure` + `SameSite=None` cookies for MCE iframe embedding

- [ ] **Query Execution (Web↔API↔Worker) & Results Viewer** — Wire editor “RUN” to backend runs, status streaming, and paged results. `M`
  - Already in place (web UI): results pane UI exists, but `apps/web/src/features/editor-workspace/EditorWorkspacePage.tsx` currently doesn’t call the API.
  - Spec notes: keep results “zero-data proxy” (no row persistence), use paging, and degrade gracefully on upstream SFMC errors/timeouts.

- [ ] **Saved Queries & History (User Persistence)** — Queries persist across sessions; users can organize and return to work quickly. `M`
  - Already in place (DB): `query_history` table exists in `packages/database/src/schema.ts`.
  - Already in place (UI scaffolding): sidebar supports `savedQueries`, but it’s currently fed an empty list.
  - Spec notes: define “saved query” vs “run history”, retention per tier, and BU scoping.

- [ ] **Target DE Wizard & Automation Deployment** — “Run to Target” + “Deploy to Automation” (Query Activity) end-to-end. `L`
  - Already in place (UI scaffolding): `apps/web/src/features/editor-workspace/components/QueryActivityModal.tsx` exists; needs backend implementation and wiring.
  - Spec notes: idempotency (avoid duplicates), naming rules, and clear rollback when SFMC operations partially fail.

- [ ] **Snippet Library v1 (Persistence + CRUD)** — Backend endpoints + UI wiring for saving/reusing SQL snippets. `M`
  - Already in place (DB): `snippets` table exists in `packages/database/src/schema.ts`.
  - Spec notes: keep sharing rules aligned with workspace model (Phase 2) so we don’t rewrite later.

- [ ] **Monetization v1 (Free/Pro/Enterprise)** — Subscription tiers with Salesforce LMA integration. `M`
  - Seat limits enforcement
  - Upgrade prompts and paywall UI
  - License verification

### Foundational Infrastructure (Next)

These establish patterns used by ALL subsequent features. Build once, instrument everything.

- [ ] **Audit Logging Infrastructure** — Core audit system that captures events from day 1. `M`
  > See: `docs/epics/audit-logs.md`
  - `audit_logs` table with tenant-scoped, immutable event records
  - `AuditService` with `log()` method for emitting events
  - Standard event types: auth, data access, resource mutations

- [ ] **Observability & Monitoring** — Centralized logging and tracing. `M`
  - Already in place: health endpoints exist in API + worker; worker exposes Prometheus metrics and Bull Board.
  - Structured logging with correlation IDs (API + worker, consistent fields)
  - Tracing (OpenTelemetry or similar), including upstream SFMC calls
  - Error tracking (Sentry or similar) replacing the current stub in `apps/api/src/common/filters/global-exception.filter.ts`
  - Health endpoints should cover DB/Redis dependency checks (not just “ok”)

  > **Operational Dashboards (FYI):**
  > - **Bull Board** — available at `/admin/queues` on worker service for queue monitoring (protected by `ADMIN_API_KEY`)
  > - **Prometheus Metrics** — exposed at `/metrics` on worker service (job counts, duration, failures)
  > - **Recommended additions:** Grafana for metrics visualization (post-launch), PostHog for product analytics
  > - See `apps/worker/README.md` for full metrics documentation

- [ ] **Input Validation Patterns** — Zod validation across all API boundaries. `S`
  - Already in place: some endpoints validate with Zod (example: shell query run creation).
  - Request validation middleware / global pipe
  - Consistent error response format
  - Validation schema patterns for reuse

- [ ] **Usage Quotas & Limits** — Tier-based limits infrastructure. `M`
  - Already in place: per-user concurrency limits for shell query runs + per-user SSE connection limits.
  - Query execution quotas (per user/tenant/month)
  - Storage limits (snippets, history retention)
  - Usage tracking and enforcement (soft warnings + hard blocks)

- [ ] **Embedded App Baseline Security** — Ensure the app behaves correctly in MCE iframe constraints while staying AppExchange-friendly. `M`
  - Security headers baseline (CSP/frame-ancestors strategy, HSTS, nosniff) without breaking iframe embedding
  - Cookie posture (`SameSite=None`, `Secure`, partitioned cookies where applicable) and CSRF posture for redirects
  - CORS posture (if/where needed) and edge protection strategy (CDN/WAF)

---

## Phase 2: Team & Admin Infrastructure

This phase builds admin controls, team management, and collaboration features. All features are instrumented with audit logging as they're built (not retrofitted).

### Epic A: Enterprise Control Plane
> See: `docs/epics/enterprise-control-plane.md`

The admin and management layer that gives customers visibility and control.

- [ ] **Tenant Admin Role** — Separate tenant-level admin permissions from workspace roles. `S`
  - `tenant_admin` role for billing, settings, audit log access
  - Distinct from workspace-level roles
  - First user in tenant auto-assigned as admin

- [ ] **Audit Log Viewer** — Admin UI for viewing and exporting audit trails. `M`
  - Filterable log viewer (by user, action, date range)
  - CSV/JSON export capability
  - Feature-gated to enterprise tier (logs are captured for all tiers)

- [ ] **Subscription Management UI** — Self-service subscription management for admins. `M`
  - View current plan and usage
  - See seat allocation and limits
  - Upgrade/downgrade flows (via Salesforce AppExchange)

### Epic B: Workspaces & Collaboration
> See: `docs/epics/workspaces-collaboration.md`

Team organization features for enterprises with multiple teams.

- [ ] **Workspaces Data Model** — Database schema for team organization within tenants. `M`
  - `workspaces` table (id, tenant_id, name, created_by)
  - `workspace_members` table (workspace_id, user_id, role)
  - Default workspace auto-creation for new tenants

- [ ] **RBAC (Hardcoded Roles)** — Role-based access control for workspace permissions. `M`
  - Four roles: `owner`, `admin`, `member`, `viewer`
  - Permission matrix for workspace actions
  - Backend authorization middleware

- [ ] **Workspace Management UI** — CRUD interface for workspace administration. `M`
  - Create/rename/delete workspaces
  - View workspace members
  - Workspace switcher in app shell

- [ ] **Workspace Membership** — Invite and manage workspace members. `M`
  - Invite users by email
  - Accept/decline invitations
  - Change member roles
  - Remove members

- [ ] **Workspace-Scoped Snippets** — Extend snippets to support workspace sharing. `M`
  - Add `workspace_id` to snippets table
  - Visibility levels: `private`, `workspace`, `tenant`
  - RLS policies for workspace isolation

---

## Phase 3: Premium Features

Advanced features that differentiate Pro and Enterprise tiers. Built on top of core product and team infrastructure.

### Pro Tier Features

Features for individual architects and power users.

- [ ] **Pre-Flight Query Validation** — Detect PK conflicts and nullability violations before saving to Target DEs. `M`
  - Schema validation against target DE structure
  - PK conflict detection
  - Nullability warnings

- [ ] **Query Performance Analyzer** — Intelligence linter to detect timeout risks. `L`
  > See: `docs/epics/query-performance-analyzer.md`
  - SQL parser for join analysis
  - Heuristics for "performance killers" (non-SARGable queries, missing indexes)
  - Timeout risk warnings (30-minute limit detection)

### Enterprise Tier Features

Features for global brands and agencies with team collaboration needs.

- [ ] **Team Snippet Libraries** — Full `teamSnippets` feature with workspace organization. `M`
  - Shared snippet folders within workspaces
  - Snippet permissions (view, edit, delete)
  - Snippet usage analytics

- [ ] **System Data View Scenario Builder** — Pre-built join templates for complex Data View queries. `M`
  - Journey/Click/Open flow templates
  - Subscriber/Send relationship templates
  - Template customization and saving

- [ ] **Multi-BU Bulk Deployment** — Deploy Query Activities and DEs across multiple Business Units. `L`
  - BU selection interface
  - SOAP-based batch deployment
  - Deployment status tracking
  - Shared folder support for cross-BU DEs

- [ ] **Advanced Audit & Compliance** — Enhanced audit capabilities for regulated industries. `M`
  - Log streaming to external SIEM (Datadog, Splunk)
  - Extended retention (1-2 years)
  - Compliance report generation

---

## Pre-Launch: Security Hardening & Compliance

Final hardening and compliance work before AppExchange submission. This starts after Phases 1–3 are complete and the initial feature set is stable (goal: everything in this roadmap is complete before security review).

### Security Hardening

- [ ] **Secrets Management** — Migrate from environment variables to managed secrets. `M`
  - Key store integration (AWS Secrets Manager, HashiCorp Vault, or similar)
  - Secret rotation capabilities
  - Audit trail for secret access

- [ ] **HTTP Security Headers** — Implement strict browser security policies. `S`
  - Content Security Policy (CSP)
  - HSTS, X-Frame-Options, X-Content-Type-Options
  - CORS configuration review

- [ ] **Rate Limiting & DDoS Protection** — Protect API from abuse. `S`
  - Per-user and per-tenant rate limits
  - Unauthenticated endpoint protection
  - Integration with CDN/WAF if needed

- [ ] **Support/Admin Access Controls** — Audited, least-privilege cross-tenant support path. `M`
  - Break-glass access for support
  - Full audit trail of support access
  - Time-limited access tokens

### AppExchange Security Review Prep

- [ ] **Security Documentation** — Prepare required security documentation. `M`
  - Security whitepaper
  - Data flow diagrams
  - Incident response plan
  - Privacy policy and DPA

- [ ] **Penetration Testing** — Third-party security assessment. `M`
  - Engage pen testing vendor
  - Remediate findings
  - Document results for AppExchange review

- [ ] **AppExchange Security Review Submission** — Complete Salesforce security review. `L`
  - Submit application for review
  - Address reviewer feedback
  - Obtain security approval

### Production Infrastructure

- [ ] **Production Environment Setup** — Production-ready infrastructure. `M`
  - Database with SSL, backups, point-in-time recovery
  - Redis with TLS
  - CDN configuration
  - Monitoring and alerting

- [ ] **Disaster Recovery & Backup** — Business continuity planning. `M`
  - Automated backup verification
  - Recovery runbooks
  - RTO/RPO documentation

---

## Notes

- **Build order:** Phase 1 foundational infrastructure (audit logging, observability, quotas) must be complete before Phase 2+ features so they can be instrumented as built.
- **Feature flags:** All tier-specific features gated via `FeatureKey` system in `packages/shared-types/src/features.ts`.
- **Audit logging:** Infrastructure in Phase 1; viewer UI in Phase 2. Logs captured for all tiers; viewing is enterprise-only.
- **SQL guardrails:** All SQL linting/autocomplete behavior must align with `apps/web/src/features/editor-workspace/utils/sql-lint/MCE-SQL-REFERENCE.md`.
