# Query Execution Requirements

## Scope Decisions

### Execution Mode
- **Decision:** "Run to Temp" only for this spec
- Execution layer receives (targetDE, query) and is mode-agnostic
- "Run to Target DE" is out of scope but architecture supports adding it later
- **Key additions:**
  - Expand SELECT * to explicit columns using metadata cache (required for temp DE schema creation)
  - Use undocumented MCE validation endpoint (POST /automation/v1/queries/actions/validate/) before execution
  - Validation flow: queryValid: true → proceed | queryValid: false → stop, show error | endpoint unreachable → proceed (graceful degradation)

### Status Update Granularity
- **Decision:** Granular states via SSE:
  - `queued → creating_data_extension → validating_query → executing_query → fetching_results → ready | failed`
- Each state includes a human-readable message for UI display

### CSRF Token Source
- **Decision:** Token comes from GET /api/auth/me response (already implemented server-side)
- Frontend must:
  1. Store csrfToken in auth store
  2. Attach as x-csrf-token header on all POST/PUT/PATCH/DELETE requests
- This is a prerequisite for query execution (AppExchange compliance)

### Error Handling
- **Decision:** Display MCE error messages directly (user-facing, don't leak internals)
- No stack traces or internal details exposed to client
- Server logs full context with correlation IDs
- UI shows error gracefully with optional "Details" expansion
- Heuristic error translation deferred to post-launch

### Concurrency Model
- **Decision:** One active run per browser tab
- Backend limits: 10 concurrent runs per user, 5 SSE connections per user
- When user hits 429 rate limit: show toast "Too many queries running. Close a tab or wait for a query to complete."
- RUN button disabled while query is in progress for current tab
- Re-enable when query completes (terminal state)
- No active run count badge (simplified per-tab model)
- No client-side queuing

### SSE Connection Handling
- On any SSE error/disconnect: show toast "Connection lost. Refresh to check status."
- Query continues running in background even if SSE disconnects
- User can refresh to check results
- No auto-retry (out of scope)

### Keyboard Shortcut
- **Decision:** Include Cmd/Ctrl+Enter to run query in this spec
- Small scope, tightly coupled to execution flow, expected by users

### Pagination UX
- **Decision:** Keep current implementation
- Pages 1-5 with "...", plus first/prev/next/last buttons
- Page input field deferred to post-launch

### Out of Scope
- Saved queries (separate feature, no dependency)
- Query history viewer (Pro tier, separate UI)
- Usage caps enforcement (separate monetization concern)

### In Scope
- Cancel button (endpoint exists, minimal work, essential UX)

## Architecture Notes

### Zero-Data Proxy Pattern
- Result rows never stored on our servers
- API proxies pagination requests directly to MCE's Data Extension REST API
- Temp DEs created with 24-hour retention policy; MCE handles cleanup automatically

### Execution Flow
```
1. Client-side lint (fast, offline)
           ↓
2. MCE Validate (POST /automation/v1/queries/actions/validate/)
   - queryValid: true → proceed
   - queryValid: false → STOP, show MCE errors
   - Endpoint fails → proceed (graceful degradation)
           ↓
3. Expand SELECT * → explicit columns (using metadata)
           ↓
4. Create temp DE with matching schema + 24hr retention
           ↓
5. Create QueryDefinition + Execute
           ↓
6. Stream status via SSE → Frontend displays results
```
