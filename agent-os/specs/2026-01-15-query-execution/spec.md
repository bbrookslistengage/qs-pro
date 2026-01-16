# Specification: Query Execution (Run to Temp)

## Goal
Enable users to execute SQL queries against MCE Data Extensions with real-time status updates via SSE, storing results in temporary Data Extensions with 24-hour retention, while enforcing rate limits and CSRF protection.

## User Stories
- As a marketer, I want to run SQL queries and see results immediately so that I can validate my data selections before building campaigns.
- As a power user, I want real-time feedback on query execution status so that I understand what is happening with my long-running queries and can cancel them if needed.

## Architecture Overview

### Zero-Data Proxy Pattern
Result rows are never stored on QS Pro servers. The API proxies pagination requests directly to MCE's Data Extension REST API (`/data/v1/customobjectdata/key/{deName}/rowset`). Temp DEs are created in the user's MCE org with 24-hour retention; MCE handles cleanup automatically.

### Execution Flow
```
1. Client-side lint (fast, offline)
        ↓
2. POST /api/runs → queues job, returns runId
        ↓
3. Worker: MCE Validate (POST /automation/v1/queries/actions/validate/)
   - queryValid: true → proceed
   - queryValid: false → fail with MCE errors
   - Endpoint unreachable → proceed (graceful degradation)
        ↓
4. Worker: Expand SELECT * → explicit columns (using metadata)
        ↓
5. Worker: Infer temp DE schema from query output columns
        ↓
6. Worker: Create temp DE with matching schema + 24hr retention
        ↓
7. Worker: Create QueryDefinition + Execute via SOAP
        ↓
8. Worker: Stream status via SSE → Frontend displays results
```

### Concurrency Model
- **Per tab/session:** One active run at a time
- **Per user (backend):** Up to 10 concurrent runs across all tabs
- **SSE connections (backend):** Up to 5 concurrent connections per user
- Users can have multiple browser tabs, each running one query (up to SSE limit)

## Specific Requirements

**CSRF Token Integration**
- Frontend must extract `csrfToken` from `GET /api/auth/me` response and store in auth store (already exists in `useAuthStore`)
- All POST/PUT/PATCH/DELETE requests must include `x-csrf-token` header
- Add axios request interceptor in `/home/blakebrooks-88/repos/qs-pro/apps/web/src/services/api.ts` to automatically attach CSRF token from auth store
- Backend CsrfGuard already validates tokens using timing-safe comparison
- **Security:** CSRF token must remain in memory only (Zustand store). Never persist to localStorage or sessionStorage.

**Frontend Query Execution Hook**
- Create `useQueryExecution` hook that manages the full execution lifecycle
- Hook returns: `{ execute, cancel, status, runId, errorMessage, isRunning }`
- States to track: `idle | queued | creating_data_extension | validating_query | executing_query | fetching_results | ready | failed | canceled`
- Use SSE via `EventSource` to subscribe to `/api/runs/:runId/events` after POST creates run
- On terminal state (ready/failed/canceled), close EventSource and fetch results if ready
- One active run per tab/session; disable RUN button while a query is in progress

**Run ID Persistence (sessionStorage)**
- Store `runId` in sessionStorage when a run starts: `sessionStorage.setItem('activeRunId', runId)`
- On hook mount, check for existing runId: `sessionStorage.getItem('activeRunId')`
- If runId exists, fetch current status via `GET /api/runs/:runId` and reconnect if still running
- Clear on terminal state: `sessionStorage.removeItem('activeRunId')`
- **Why sessionStorage:** Tab-scoped by browser design (aligns with one-run-per-tab model), survives page refresh, automatically cleared when tab closes
- **Security:** runId is just a job identifier (UUID), not sensitive data. Access to results still requires authenticated session via HTTP-only cookies.

**Run Button and Error UX**
- Disable RUN button while `isRunning` is true (query in progress for this tab)
- On 429 rate limit (too many concurrent runs across tabs): show toast "Too many queries running. Close a tab or wait for a query to complete."
- Integrate with existing `handleRunRequest` in EditorWorkspace component

**SSE Connection Handling**
- Open EventSource with `withCredentials: true` for cookie-based auth
- On any SSE error/disconnect (including connection limit): show toast "Connection lost. Refresh to check status."
  - Note: EventSource doesn't expose HTTP status codes, so we can't distinguish between rate limit and network errors
- Query continues running in background even if SSE disconnects
- On page refresh: hook reads `runId` from sessionStorage, fetches status via `GET /api/runs/:runId`, and reconnects SSE if still running or displays results if complete
- No auto-retry on SSE disconnect (out of scope) — user must manually refresh

**Keyboard Shortcut**
- Bind Cmd/Ctrl+Enter to trigger query execution
- Leverage existing `onRunRequest` prop in MonacoQueryEditor (already calls parent handler)
- Only fire if no blocking diagnostics (matches existing button behavior)

**Status Display in Results Pane**
- Extend `ExecutionResult` type to include granular status states
- Update ResultsPane to show human-readable status messages per state
- Status messages: "Queued...", "Creating temp Data Extension...", "Validating query...", "Executing query...", "Fetching results...", "Query completed", "Query failed: [error]"

**Cancel Button**
- Add Cancel button that appears when status is not terminal (queued, running states)
- Call `POST /api/runs/:runId/cancel` endpoint (already exists in backend)
- Update UI to show "Canceled" status

**MCE Validation Integration (Backend)**
- Before execution, call MCE validation endpoint: `POST /automation/v1/queries/actions/validate/`
- Request body: `{ "Text": "<sql>" }`
- On `queryValid: true` proceed with execution
- On `queryValid: false` stop and return MCE error messages to client
- On endpoint failure (network error, 5xx) proceed with execution (graceful degradation)
- **Security:** Do not log raw SQL text (may contain PII). Log only SQL hash for correlation.

**SELECT * Expansion (Backend)**
- When SQL contains `SELECT *`, expand to explicit column list using metadata cache
- Required because temp DE schema must match query output columns
- Use existing MetadataService to fetch field definitions for source Data Extensions
- Handle table aliases (e.g., `SELECT * FROM Customers c` → resolve `c` to `Customers`)

**Temp DE Schema Inference (Backend)**
The temp DE must have columns matching the query's SELECT output. Infer column types as follows:

| Query Element | Type Inference |
|---------------|----------------|
| Direct column (`FirstName`) | Look up field type from metadata cache |
| Aliased column (`c.FirstName`) | Resolve alias → look up in metadata cache |
| Aggregate (`COUNT(*)`, `SUM(x)`) | Function mapping: COUNT→Number, SUM→Number, AVG→Decimal, MIN/MAX→source type |
| String function (`CONCAT()`, `LEFT()`, `RIGHT()`, `UPPER()`, `LOWER()`) | Text |
| Date function (`GETDATE()`, `DATEADD()`) | Date |
| `CAST(x AS type)` / `CONVERT(type, x)` | Parse target type from SQL |
| `CASE WHEN...THEN...END` | Infer from first THEN branch type |
| Literal string (`'hello'`) | Text |
| Literal number (`123`, `45.67`) | Number / Decimal |
| Unknown/complex expression | Default to Text(254) |

- Parse query using `node-sql-parser` (install in worker; already used in web for linting)
- Extract SELECT columns with their aliases
- For each column, apply type inference rules above
- Create temp DE with inferred schema before executing query

**Metadata Unavailable Handling:**
- If `SELECT *` and metadata unavailable for table: attempt server-side metadata fetch for just that DE
- If still unavailable: **fail with error** "Unable to expand SELECT *. Metadata unavailable for table {tableName}. Try listing columns explicitly."
- If explicit columns (no `*`) and metadata unavailable: **graceful degradation** — infer all columns as Text(254)
- Show warning to user: "Metadata unavailable. Types defaulted to Text."

**Column Name Handling:**
- If name exceeds 50 chars: truncate to first 45 chars, then append deterministic suffix (e.g., `VeryLongColumnName...` → `VeryLongColumnNameThatExceedsFiftyC_a1b2`)
- If duplicates exist after processing: append `_1`, `_2`, etc. to make unique (defense in depth)

**Table Identifier Resolution:**
- SQL `FROM` clause uses DE **Name** (not CustomerKey) — this is standard MCE SQL behavior
- Metadata lookup flow:
  1. Strip brackets from SQL identifier: `[My DE]` → `My DE`
  2. Search metadata cache for DE where `Name = "My DE"` (within current BU scope)
  3. Use DE's `CustomerKey` to fetch field definitions if not already cached
- Handle special prefixes:
  - `Ent.` prefix for Shared Data Extensions (e.g., `FROM Ent.SharedDE`) — search shared DE list
  - `_` prefix for System Data Views (e.g., `FROM _Job`, `FROM _Sent`) — use hardcoded schemas
- Names with spaces/hyphens must be bracketed: `FROM [My Data Extension]`
- **System Data Views:** Use existing `system-data-views.ts` which contains complete field definitions for 29 Data Views with proper types (Number, Text, Date, Boolean, Email, Phone, Decimal)
  - Worker should import/copy these definitions to look up Data View fields
  - `isSystemDataView(name)` checks if table is a Data View
  - `getSystemDataViewFields(name)` returns field definitions with types

**DE Field Property Mapping:**
When creating temp DE fields, use these MCE DataExtensionField properties:

| Inferred Type | MCE FieldType | Properties |
|---------------|---------------|------------|
| Text (direct column) | Text | `MaxLength: 254` |
| Text (from function) | Text | `MaxLength: 4000` |
| Number | Number | (none) |
| Decimal | Decimal | `Scale: 2, Precision: 18` |
| Date | Date | (none) |
| Boolean | Boolean | (none) |
| Email | EmailAddress | (none) |
| Phone | Phone | (none) |
| Unknown | Text | `MaxLength: 254` |

**Note:** If MCE rejects data due to Email/Phone validation during query execution, the error is surfaced to the user via the normal error flow.

**Temp DE Retention (Backend)**
- Set `DataRetentionPeriodLength: 1` and `DataRetentionPeriod: "Days"` on temp DE creation
- MCE automatically deletes the entire DE after 24 hours
- Naming convention: `QPP_Results_{runId_prefix}` or `QPP_{snippetName}_{runId_prefix}`

**SSE Event Payload Contract**
All SSE events from `/api/runs/:runId/events` follow this structure:

```typescript
interface SSEEvent {
  status: 'queued' | 'creating_data_extension' | 'validating_query' | 'executing_query' | 'fetching_results' | 'ready' | 'failed' | 'canceled';
  message: string;           // Human-readable status message
  errorMessage?: string;     // Present only when status is 'failed'
  timestamp: string;         // ISO 8601 format
  runId: string;             // Run identifier
}
```

Status messages:
- `queued`: "Queued..."
- `creating_data_extension`: "Creating temp Data Extension..."
- `validating_query`: "Validating query..."
- `executing_query`: "Executing query..."
- `fetching_results`: "Fetching results..."
- `ready`: "Query completed"
- `failed`: "Query failed: {errorMessage}"
- `canceled`: "Query canceled"

**Run Endpoint Authorization**
All run endpoints must enforce user-level ownership checks to prevent IDOR vulnerabilities:
- `GET /runs/:runId` — 404 if run doesn't exist or user doesn't own it
- `GET /runs/:runId/events` (SSE) — 404 if run doesn't exist or user doesn't own it
- `GET /runs/:runId/results` — 404 if run doesn't exist or user doesn't own it
- `POST /runs/:runId/cancel` — 404 if run doesn't exist or user doesn't own it

RLS (`app.tenant_id` + `app.mid`) already scopes queries to the current user's BU, so unauthorized runs naturally return no rows (404). This behavior must be preserved — never return 403 for authorization failures (avoids information disclosure about run existence).

## Existing Code to Leverage

**ShellQueryController** (`/home/blakebrooks-88/repos/qs-pro/apps/api/src/shell-query/shell-query.controller.ts`)
- POST `/runs` endpoint creates run, returns `{ runId, status: 'queued' }`
- **[TO ADD - TG4.0]** GET `/runs/:runId` returns current run status (needed for reconnection after page refresh)
- SSE endpoint `/runs/:runId/events` streams status updates
- GET `/runs/:runId/results` fetches paginated results from temp DE
- POST `/runs/:runId/cancel` cancels running query

**ShellQueryService** (`/home/blakebrooks-88/repos/qs-pro/apps/api/src/shell-query/shell-query.service.ts`)
- `createRun()` checks rate limit (10 concurrent), persists to DB, adds to BullMQ queue
- `getResults()` proxies to MCE REST API for temp DE rowset data
- `cancelRun()` marks run as canceled in DB

**ShellQueryProcessor** (`/home/blakebrooks-88/repos/qs-pro/apps/worker/src/shell-query/shell-query.processor.ts`)
- BullMQ processor handles job execution with concurrency 50
- Publishes status updates via Redis pub/sub to channel `run-status:{runId}`
- Polls MCE AsyncActivityStatus via SOAP until Complete/Error
- Cleans up QueryDefinition after completion

**Auth Store** (`/home/blakebrooks-88/repos/qs-pro/apps/web/src/store/auth-store.ts`)
- Already stores `csrfToken` in Zustand store
- `setAuth()` accepts csrfToken parameter
- Use `useAuthStore().csrfToken` to access token for API calls

**EditorWorkspace** (`/home/blakebrooks-88/repos/qs-pro/apps/web/src/features/editor-workspace/components/EditorWorkspace.tsx`)
- `handleRunRequest()` already validates blocking diagnostics before calling `onRun`
- `executionResult` state drives ResultsPane display
- MonacoQueryEditor already has `onRunRequest` prop for keyboard shortcut

**API Client** (`/home/blakebrooks-88/repos/qs-pro/apps/web/src/services/api.ts`)
- Axios instance with `withCredentials: true`
- Already has response interceptor for 401 handling
- Add request interceptor here for CSRF token attachment

## Out of Scope
- "Run to Target DE" mode (architecture supports but not implemented this spec)
- Saved queries persistence and management
- Query history viewer (Pro tier feature)
- Usage caps and monetization enforcement
- Client-side query queueing when at rate limit
- Heuristic error message translation (show MCE errors directly for now)
- Page number input field for pagination (keep current 1-5 with ellipsis)
- Auto-retry logic for transient SSE disconnections (show error, rely on page refresh)
- Multiple concurrent runs within a single browser tab (one active run per tab)
- In-app query tabs (multiple editor tabs within QS Pro UI)
- Cancel behavior for already-completed runs (backend returns "already completed", frontend ignores)

## Related Future Work (Separate PRs)
- **Table validation linting:** Verify FROM/JOIN tables exist in metadata cache
- **Duplicate column linting:** Detect ambiguous column names (e.g., `SELECT a, a FROM DE`)
- **Invalid identifier linting:** Detect unbracketed spaces in identifiers
