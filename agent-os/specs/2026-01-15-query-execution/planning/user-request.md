# User Request: Query Execution

## Original Request

Wire the editor "RUN" button to execute SQL queries against Marketing Cloud Engagement (MCE), show real-time status updates, and display paginated results. This is the critical path for the QS Pro MVP.

## Context

From the product roadmap (Phase 1 - Core Product Features):

> **Query Execution (Web↔API↔Worker) & Results Viewer** — Wire editor "RUN" to backend runs, status streaming, and paged results.
> - Already in place (web UI): results pane UI exists, but `EditorWorkspacePage.tsx` currently doesn't call the API.
> - Spec notes: keep results "zero-data proxy" (no row persistence), use paging, and degrade gracefully on upstream SFMC errors/timeouts.
> - Wire CSRF end-to-end: attach `x-csrf-token` to all state-changing requests and add tests that assert requests without CSRF are rejected.

## User Goals

1. **Run queries and see results immediately** — Marketers need to validate data selections before building campaigns
2. **Understand query progress** — Long-running queries should show what's happening (not just a spinner)
3. **Cancel if needed** — Ability to stop a query that's taking too long
4. **Keyboard efficiency** — Power users expect Cmd/Ctrl+Enter to run queries

## Constraints

- Zero-data proxy pattern: Don't store query results on QS Pro servers
- AppExchange security compliance: CSRF protection, no PII in logs
- MCE limitations: 30-minute query timeout, rate limits on API calls
- Browser limitations: SSE connection limits, tab isolation

## Success Criteria

- User can run a query from the editor and see results in the results pane
- Real-time status updates show query progress
- Errors from MCE are displayed clearly
- Keyboard shortcut (Cmd/Ctrl+Enter) works
- Cancel button stops in-progress queries
