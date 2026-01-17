# Task Breakdown: Query Execution (Run to Temp)

## Overview
Total Tasks: 49 sub-tasks across 7 task groups

This breakdown implements the full query execution flow including CSRF token integration, SSE-based status streaming, error handling UX, keyboard shortcuts, cancel functionality, backend MCE validation, and temp DE schema inference.

## Task List

### CSRF & API Foundation

#### Task Group 1: CSRF Token Integration
**Dependencies:** None
**Complexity:** Low
**Estimated effort:** 2-3 hours

- [x] 1.0 Complete CSRF token integration for API requests
  - [x] 1.1 Write 3-5 focused tests for CSRF token handling
    - Test: API client attaches x-csrf-token header on POST requests
    - Test: API client attaches x-csrf-token header on PUT/PATCH/DELETE requests
    - Test: API client omits header on GET requests
    - Test: Missing token does not crash (graceful fallback)
  - [x] 1.2 Add request interceptor to attach CSRF token
    - File: `/home/blakebrooks-88/repos/qs-pro/apps/web/src/services/api.ts`
    - Add request interceptor that reads `useAuthStore.getState().csrfToken`
    - Attach as `x-csrf-token` header for POST/PUT/PATCH/DELETE methods
    - Pattern: Check method before attaching (GET requests excluded)
  - [x] 1.3 Verify /api/auth/me response includes csrfToken
    - File: `/home/blakebrooks-88/repos/qs-pro/apps/web/src/services/auth.ts`
    - Confirm `setAuth()` is called with csrfToken from response
    - Existing store already has `csrfToken` field - ensure it's populated
  - [x] 1.4 Ensure CSRF tests pass
    - Run ONLY the 3-5 tests written in 1.1
    - Verify interceptor correctly attaches token

**Acceptance Criteria:**
- All mutating API requests include x-csrf-token header
- Token is read from auth store (already populated by /api/auth/me)
- GET requests do not include the header
- Tests from 1.1 pass

**Files to modify:**
- `/home/blakebrooks-88/repos/qs-pro/apps/web/src/services/api.ts`

---

### Frontend Query Execution Hook

#### Task Group 2: useQueryExecution Hook
**Dependencies:** Task Group 1
**Complexity:** High
**Estimated effort:** 6-8 hours

- [x] 2.0 Complete query execution hook with SSE lifecycle management
  - [x] 2.1 Write 8-10 focused tests for useQueryExecution hook
    - Test: `execute()` calls POST /api/runs and returns runId
    - Test: Hook opens EventSource to /api/runs/:runId/events after execute
    - Test: Status transitions through states (queued -> running -> ready)
    - Test: `cancel()` calls POST /api/runs/:runId/cancel
    - Test: EventSource closes on terminal states (ready/failed/canceled)
    - Test: `isRunning` returns true when status is non-terminal
    - Test: Rate limit error (429) shows toast and resets to idle
    - Test: SSE connection error shows "Connection lost" toast but keeps current status (query continues in background)
    - Test: On execute, runId is stored in sessionStorage
    - Test: On mount with existing sessionStorage runId, hook fetches status and reconnects
  - [x] 2.2 Create useQueryExecution hook file
    - File: `/home/blakebrooks-88/repos/qs-pro/apps/web/src/features/editor-workspace/hooks/use-query-execution.ts`
    - Export interface: `{ execute, cancel, status, isRunning, runId, errorMessage }`
  - [x] 2.3 Implement execute() function
    - POST to `/api/runs` with `{ sqlText, snippetName }`
    - Handle 429 rate limit response (show toast: "Too many queries running. Close a tab or wait for a query to complete.", reset to idle)
    - Handle 201 success (extract runId, set status to 'queued')
    - On success, initiate SSE connection
  - [x] 2.4 Implement SSE subscription logic
    - Create EventSource to `/api/runs/${runId}/events`
    - Include credentials: `withCredentials: true`
    - Parse incoming messages, update status state
    - Map SSE events to status states: queued, creating_data_extension, validating_query, executing_query, fetching_results, ready, failed, canceled
    - On SSE error/disconnect: show toast "Connection lost. Refresh to check status."
    - Note: Query continues running in background — don't set status to 'failed', keep current status
    - User can refresh page to check results
  - [x] 2.5 Implement cancel() function
    - POST to `/api/runs/${runId}/cancel`
    - Update status to 'canceled' on success
    - Close EventSource if open
  - [x] 2.6 Implement isRunning computed property
    - Return true when status is non-terminal (queued, creating_data_extension, validating_query, executing_query, fetching_results)
    - Return false for terminal states (idle, ready, failed, canceled)
  - [x] 2.7 Implement cleanup on unmount
    - Close EventSource in useEffect cleanup
    - Prevent memory leaks from orphaned connections
  - [x] 2.8 Implement sessionStorage persistence for runId
    - On execute success: `sessionStorage.setItem('activeRunId', runId)`
    - On terminal state: `sessionStorage.removeItem('activeRunId')`
    - Key name: `'activeRunId'` (tab-scoped by browser design)
  - [x] 2.9 Implement reconnection on mount
    - On mount, check `sessionStorage.getItem('activeRunId')`
    - If runId exists: call `GET /api/runs/:runId` to fetch current status
    - If still running: reconnect to SSE stream
    - If terminal: display results or error, clear sessionStorage
    - If 404 (run not found): clear sessionStorage, reset to idle
  - [x] 2.10 Ensure hook tests pass
    - Run ONLY the 8-10 tests written in 2.1
    - Mock fetch, EventSource, and sessionStorage for testing

**Acceptance Criteria:**
- Hook manages full execution lifecycle (one run per tab)
- SSE connection established after successful POST
- Status updates reflected in real-time
- Cancel functionality works
- Error states handled gracefully with user-friendly toasts
- runId persisted in sessionStorage; survives page refresh
- On refresh, hook reconnects to running query or displays completed results
- Tests from 2.1 pass

**Files to create:**
- `/home/blakebrooks-88/repos/qs-pro/apps/web/src/features/editor-workspace/hooks/use-query-execution.ts`
- `/home/blakebrooks-88/repos/qs-pro/apps/web/src/features/editor-workspace/hooks/use-query-execution.test.ts`

---

### Frontend UI Components

#### Task Group 3: UI Components and Integration
**Dependencies:** Task Group 2
**Complexity:** Medium
**Estimated effort:** 5-6 hours

- [x] 3.0 Complete UI integration for query execution
  - [x] 3.1 Write 4-6 focused tests for UI components
    - Test: Run button disabled when isRunning is true
    - Test: Cancel button appears during non-terminal states
    - Test: Cancel button hidden on terminal states
    - Test: ResultsPane shows correct status message per state
    - Test: Cmd/Ctrl+Enter triggers execution
    - Test: Cmd/Ctrl+Enter does not trigger when isRunning is true
  - [x] 3.2 Extend ExecutionResult type with granular statuses
    - File: `/home/blakebrooks-88/repos/qs-pro/apps/web/src/features/editor-workspace/types.ts`
    - Add union type: `'idle' | 'queued' | 'creating_data_extension' | 'validating_query' | 'executing_query' | 'fetching_results' | 'ready' | 'failed' | 'canceled'`
    - Add `statusMessage?: string` field for human-readable display
    - Add `runId?: string` field for cancel operations
  - [x] 3.3 Update EditorWorkspace to use useQueryExecution
    - File: `/home/blakebrooks-88/repos/qs-pro/apps/web/src/features/editor-workspace/components/EditorWorkspace.tsx`
    - Import and use `useQueryExecution` hook
    - Connect `handleRunRequest` to `execute()`
    - Pass status and results to ResultsPane
  - [x] 3.4 Disable RUN button while query is running
    - Disable RUN button when `isRunning` is true
    - Show visual indicator that query is in progress (e.g., spinner on button)
    - Re-enable automatically when status becomes terminal
  - [x] 3.5 Add Cancel button to ResultsPane
    - File: `/home/blakebrooks-88/repos/qs-pro/apps/web/src/features/editor-workspace/components/ResultsPane.tsx`
    - Show Cancel button when status is non-terminal
    - Wire to `cancel()` from useQueryExecution
    - Hide on terminal states (ready, failed, canceled)
  - [x] 3.6 Update ResultsPane status messages
    - Map status states to user-friendly messages:
      - queued: "Queued..."
      - creating_data_extension: "Creating temp Data Extension..."
      - validating_query: "Validating query..."
      - executing_query: "Executing query..."
      - fetching_results: "Fetching results..."
      - ready: "Query completed"
      - failed: "Query failed: {errorMessage}"
      - canceled: "Query canceled"
    - Show spinner for in-progress states
  - [x] 3.7 Implement Cmd/Ctrl+Enter keyboard shortcut
    - MonacoQueryEditor already has `onRunRequest` prop
    - Verify shortcut triggers `handleRunRequest` in EditorWorkspace
    - Ensure blocking diagnostics check applies to keyboard shortcut
    - Ensure shortcut is ignored when isRunning is true
  - [x] 3.8 Ensure UI component tests pass
    - Run ONLY the 4-6 tests written in 3.1

**Acceptance Criteria:**
- Run button disabled while query is in progress
- Cancel button appears for in-progress runs
- Status messages display correctly
- Keyboard shortcut works (and is disabled during execution)
- Tests from 3.1 pass

**Files to modify:**
- `/home/blakebrooks-88/repos/qs-pro/apps/web/src/features/editor-workspace/types.ts`
- `/home/blakebrooks-88/repos/qs-pro/apps/web/src/features/editor-workspace/components/EditorWorkspace.tsx`
- `/home/blakebrooks-88/repos/qs-pro/apps/web/src/features/editor-workspace/components/ResultsPane.tsx`

---

### Backend Validation & Query Processing

#### Task Group 4: MCE Validation Integration
**Dependencies:** None (can run parallel to frontend tasks)
**Complexity:** Medium
**Estimated effort:** 4-5 hours

- [x] 4.0 Add GET /api/runs/:runId status endpoint (prerequisite for frontend reconnection)
  - [x] 4.0.1 Write 3-4 tests for run status endpoint
    - Test: Returns current status for valid runId owned by user
    - Test: Returns 404 for non-existent runId
    - Test: Returns 404 for runId owned by different user (RLS hides existence)
    - Test: Includes errorMessage when status is 'failed'
  - [x] 4.0.2 Add GET route to ShellQueryController
    - File: `/home/blakebrooks-88/repos/qs-pro/apps/api/src/shell-query/shell-query.controller.ts`
    - Route: `@Get(':runId')`
    - Response: `{ runId, status, errorMessage?, createdAt, updatedAt }`
  - [x] 4.0.3 Add getRunStatus() to ShellQueryService
    - File: `/home/blakebrooks-88/repos/qs-pro/apps/api/src/shell-query/shell-query.service.ts`
    - Query run from DB by runId (RLS enforces ownership)
    - Return status and metadata

- [x] 4.1 Complete MCE validation before query execution
  - [x] 4.1.1 Write 4-6 focused tests for MCE validation
    - Test: Valid query proceeds to execution
    - Test: Invalid query returns MCE error message, stops execution
    - Test: Validation endpoint failure (5xx) proceeds with execution (graceful degradation)
    - Test: Validation endpoint timeout proceeds with execution
    - Test: Network error proceeds with execution
  - [x] 4.1.2 Create MCE validation service method
    - File: `/home/blakebrooks-88/repos/qs-pro/apps/worker/src/shell-query/mce-query-validator.ts`
    - Method: `validateQuery(sqlText: string): Promise<{ valid: boolean, errors?: string[] }>`
    - Call: `POST /automation/v1/queries/actions/validate/`
    - Body: `{ "Text": sqlText }` (verify against MCE docs before implementing)
  - [x] 4.1.3 Implement validation response handling
    - On `queryValid: true` -> return `{ valid: true }`
    - On `queryValid: false` -> return `{ valid: false, errors: [messages] }`
    - On network/timeout error -> return `{ valid: true }` (graceful degradation)
    - Log all validation outcomes for debugging
  - [x] 4.1.4 Integrate validation into RunToTempFlow
    - File: `/home/blakebrooks-88/repos/qs-pro/apps/worker/src/shell-query/strategies/run-to-temp.strategy.ts`
    - Call validation before creating temp DE
    - On validation failure: throw error with MCE messages
    - Publish SSE event: `validating_query` before validation
  - [x] 4.1.5 Ensure validation tests pass
    - Run ONLY the 4-6 tests written in 4.1.1

**Acceptance Criteria:**
- GET /api/runs/:runId returns run status with ownership check
- Queries validated against MCE before execution
- Invalid queries stopped with clear error messages
- Validation failures don't block execution (graceful degradation)
- Tests from 4.0.1 and 4.1.1 pass

**Files to create:**
- `/home/blakebrooks-88/repos/qs-pro/apps/worker/src/shell-query/mce-query-validator.ts`
- `/home/blakebrooks-88/repos/qs-pro/apps/worker/src/shell-query/mce-query-validator.spec.ts`

**Files to modify:**
- `/home/blakebrooks-88/repos/qs-pro/apps/api/src/shell-query/shell-query.controller.ts` (add GET :runId route)
- `/home/blakebrooks-88/repos/qs-pro/apps/api/src/shell-query/shell-query.service.ts` (add getRunStatus)
- `/home/blakebrooks-88/repos/qs-pro/apps/worker/src/shell-query/strategies/run-to-temp.strategy.ts`

---

#### Task Group 5: SELECT * Expansion & Schema Inference
**Dependencies:** Task Group 4
**Complexity:** High
**Estimated effort:** 6-8 hours

- [x] 5.0 Complete SELECT * expansion and temp DE schema inference
  - [x] 5.0.1 Install node-sql-parser in worker
    - Run: `pnpm --filter worker add node-sql-parser`
    - Note: Package already exists in apps/web for linting; adding to worker for schema inference
  - [x] 5.1 Write 10-12 focused tests for query analysis
    - Test: `SELECT * FROM DE` expands to explicit column list
    - Test: `SELECT a, * FROM DE` expands correctly (preserves named columns)
    - Test: Table alias resolution (`SELECT * FROM Customers c` resolves `c`)
    - Test: No expansion needed for queries without SELECT *
    - Test: `SELECT *` with metadata unavailable fails with clear error message
    - Test: Explicit columns with metadata unavailable defaults to Text(254)
    - Test: `SELECT * FROM _Sent` expands using hardcoded Data View schema
    - Test: Data View fields have correct types (e.g., `_Sent.JobID` → Number)
    - Test: Column type inferred from metadata cache for direct columns
    - Test: Aggregate functions return correct types (COUNT→Number, AVG→Decimal)
    - Test: Unknown expressions default to Text(254)
    - Test: Column names exceeding 50 chars are truncated to 45 chars + suffix
    - Test: Duplicate column names after truncation get `_1`, `_2` suffixes
  - [x] 5.2 Create query expansion utility
    - File: `/home/blakebrooks-88/repos/qs-pro/apps/worker/src/shell-query/query-analyzer.ts`
    - Method: `expandSelectStar(sqlText: string, metadataFn: MetadataFetcher): Promise<string>`
    - Parse SQL using `node-sql-parser` to identify `SELECT *` clauses
    - Fetch field definitions for each source table
  - [x] 5.3 Implement SQL parsing for table extraction
    - Extract table names from FROM and JOIN clauses
    - Handle table aliases (build alias → table name map)
    - Support subqueries (expand inner SELECT * first)
    - Handle special prefixes:
      - `Ent.` prefix for Shared Data Extensions — search shared DE list
      - `_` prefix for System Data Views — use hardcoded schemas from `system-data-views.ts`
    - Strip brackets from names: `[My DE]` → `My DE`
  - [x] 5.4 Implement column list construction
    - For regular DEs (3-step resolution):
      1. Strip brackets from SQL identifier: `[My DE]` → `My DE`
      2. Search metadata cache for DE where `Name = "My DE"` (within current BU scope)
      3. Use DE's `CustomerKey` to fetch field definitions if not already cached
    - For System Data Views (`_Job`, `_Sent`, etc.): use `getSystemDataViewFields(name)` from existing `system-data-views.ts` (copy to worker or create shared package)
    - Build explicit column list: `table.col1, table.col2, ...`
    - Replace `*` with expanded list in original query
    - If `SELECT *` and metadata still unavailable: fail with error "Unable to expand SELECT *. Metadata unavailable for table {tableName}."
  - [x] 5.5 Create schema inference utility
    - File: `/home/blakebrooks-88/repos/qs-pro/apps/worker/src/shell-query/schema-inferrer.ts`
    - Method: `inferSchema(sqlText: string, metadataFn: MetadataFetcher): Promise<ColumnDefinition[]>`
    - Parse SELECT columns with aliases
    - Apply type inference rules:
      - Direct column → metadata cache lookup
      - Aliased column → resolve alias, then metadata lookup
      - Aggregate (COUNT, SUM, AVG, MIN, MAX) → function type mapping
      - String functions (CONCAT, LEFT, RIGHT, UPPER, LOWER) → Text
      - Date functions (GETDATE, DATEADD) → Date
      - CAST/CONVERT → parse target type
      - CASE WHEN → infer from first THEN branch
      - Literals → infer from value (string→Text, number→Number)
      - Unknown → Text(254)
  - [x] 5.6 Implement function type mapping
    - Create mapping: `{ COUNT: 'Number', SUM: 'Number', AVG: 'Decimal', ... }`
    - Handle MIN/MAX by looking up source column type
    - Handle nested functions by evaluating innermost first
  - [x] 5.6.1 Implement column name sanitization
    - Truncate names > 50 chars to first 45 chars
    - If duplicates after truncation, append `_1`, `_2`, etc.
    - This is defense in depth (linter should catch duplicates, but handle anyway)
  - [x] 5.6.2 Implement DE field property mapping
    - Text (direct column): `MaxLength: 254`
    - Text (from function): `MaxLength: 4000`
    - Number: no extra properties
    - Decimal: `Scale: 2, Precision: 18`
    - Date: no extra properties
    - Boolean: no extra properties
    - Email: MCE FieldType `EmailAddress` (preserve from Data View sources)
    - Phone: MCE FieldType `Phone` (preserve from Data View sources)
    - Unknown: Text with `MaxLength: 254`
  - [x] 5.7 Integrate into RunToTempFlow
    - Call expansion after validation
    - Call schema inference on expanded query
    - Create temp DE with inferred schema
    - Pass expanded query to QueryDefinition
  - [x] 5.8 Ensure tests pass
    - Run ONLY the 10-12 tests written in 5.1

**Acceptance Criteria:**
- SELECT * queries expanded to explicit columns
- Temp DE schema correctly inferred from query output
- All supported query forms have correct type inference
- Unknown expressions safely default to Text(254)
- Tests from 5.1 pass

**Files to create:**
- `/home/blakebrooks-88/repos/qs-pro/apps/worker/src/shell-query/query-analyzer.ts`
- `/home/blakebrooks-88/repos/qs-pro/apps/worker/src/shell-query/schema-inferrer.ts`
- `/home/blakebrooks-88/repos/qs-pro/apps/worker/src/shell-query/query-analyzer.spec.ts`

**Files to modify:**
- `/home/blakebrooks-88/repos/qs-pro/apps/worker/src/shell-query/strategies/run-to-temp.strategy.ts`

---

### Granular Status Events

#### Task Group 6: SSE Status Granularity
**Dependencies:** Task Groups 4, 5
**Complexity:** Low-Medium
**Estimated effort:** 3-4 hours

- [x] 6.0 Complete granular status event publishing
  - [x] 6.1 Write 3-5 focused tests for status event flow
    - Test: Status progresses through all stages in correct order
    - Test: Each status includes human-readable message
    - Test: Terminal states include appropriate metadata (error message, completion time)
  - [x] 6.2 Update ShellQueryJob type with granular statuses
    - File: `/home/blakebrooks-88/repos/qs-pro/apps/worker/src/shell-query/shell-query.types.ts`
    - Add status enum: `'queued' | 'creating_data_extension' | 'validating_query' | 'executing_query' | 'fetching_results' | 'ready' | 'failed' | 'canceled'`
    - Add status message mapping
  - [x] 6.3 Update processor to publish granular events
    - File: `/home/blakebrooks-88/repos/qs-pro/apps/worker/src/shell-query/shell-query.processor.ts`
    - Publish `validating_query` before MCE validation call
    - Publish `creating_data_extension` before temp DE creation
    - Publish `executing_query` when starting query
    - Publish `fetching_results` when polling completes (ready to fetch)
  - [x] 6.4 Update RunToTempFlow to emit status at each step
    - File: `/home/blakebrooks-88/repos/qs-pro/apps/worker/src/shell-query/strategies/run-to-temp.strategy.ts`
    - Accept status callback or event emitter
    - Emit status at: validation start, DE creation start, query execution start
  - [x] 6.5 Ensure status event tests pass
    - Run ONLY the 3-5 tests written in 6.1

**Acceptance Criteria:**
- All status stages emit SSE events
- Frontend receives granular status updates
- Status messages are user-friendly
- Tests from 6.1 pass

**Files to modify:**
- `/home/blakebrooks-88/repos/qs-pro/apps/worker/src/shell-query/shell-query.types.ts`
- `/home/blakebrooks-88/repos/qs-pro/apps/worker/src/shell-query/shell-query.processor.ts`
- `/home/blakebrooks-88/repos/qs-pro/apps/worker/src/shell-query/strategies/run-to-temp.strategy.ts`

---

### Integration Testing

#### Task Group 7: Test Review & Gap Analysis
**Dependencies:** Task Groups 1-6
**Complexity:** Medium
**Estimated effort:** 3-4 hours

- [x] 7.0 Review existing tests and fill critical gaps only
  - [x] 7.1 Review tests from Task Groups 1-6
    - Review 3-5 tests from CSRF integration (Task 1.1) - 4 tests found
    - Review 8-10 tests from useQueryExecution hook (Task 2.1) - 12 tests found
    - Review 4-6 tests from UI components (Task 3.1) - 16 tests added (ResultsPane)
    - Review 3-4 tests from run status endpoint (Task 4.0.1) - 4 tests found
    - Review 4-6 tests from MCE validation (Task 4.1.1) - 5 tests found
    - Review 10-12 tests from SELECT * expansion (Task 5.1) - 25 tests found
    - Review 3-5 tests from SSE status events (Task 6.1) - 5 tests found
    - Total existing tests: approximately 71 tests
  - [x] 7.2 Analyze test coverage gaps for query execution feature
    - Identified critical end-to-end workflows lacking coverage
    - Focused on integration points between frontend and backend
    - Check: Full execution flow from button click to results display - COVERED
    - Check: Error handling across the stack - COVERED
    - Check: Cancel flow end-to-end - COVERED
  - [x] 7.3 Write up to 10 additional strategic tests maximum
    - E2E: Execute query -> receive status updates -> display results - ADDED
    - E2E: Execute query -> cancel -> verify canceled state - ADDED
    - E2E: Rate limit reached -> button disabled -> run completes -> button enabled - ADDED
    - Integration: CSRF token flows through to backend - ADDED (2 tests)
    - Integration: MCE validation error surfaces in UI - ADDED
    - Integration: SSE reconnection on page refresh - ADDED (2 tests)
    - Total new tests added: 8 integration tests
  - [x] 7.4 Run feature-specific tests only
    - Run ALL tests related to query execution feature
    - Actual total: 101 query execution feature tests
    - All critical workflows pass
    - Did NOT run unrelated application tests

**Acceptance Criteria:**
- All feature-specific tests pass - VERIFIED
- Critical end-to-end workflows covered - VERIFIED
- No more than 10 additional tests added - VERIFIED (8 added)
- Feature is ready for QA - VERIFIED

---

## Execution Order

Recommended implementation sequence with parallelization:

```
Phase 1 (Parallel):
├── Task Group 1: CSRF Token Integration (Frontend)
└── Task Group 4: MCE Validation Integration (Backend)

Phase 2 (Parallel, after Phase 1):
├── Task Group 2: useQueryExecution Hook (Frontend, needs TG1)
└── Task Group 5: SELECT * Expansion (Backend, needs TG4)

Phase 3 (Sequential):
└── Task Group 6: SSE Status Granularity (Backend, needs TG4+5)

Phase 4 (Sequential):
└── Task Group 3: UI Components and Integration (Frontend, needs TG2)

Phase 5 (Sequential):
└── Task Group 7: Test Review & Gap Analysis (needs all TGs)
```

## Dependency Graph

```
TG1 (CSRF) ──────────────────────────────┐
                                         ├──> TG2 (Hook) ──> TG3 (UI) ──┐
TG4 (Validation) ──> TG5 (Schema Inference) ──> TG6 (SSE) ──────────────┼──> TG7 (Tests)
```

## Risk Areas

1. **SSE Connection Reliability**: EventSource may not work with all proxy configurations. Fallback to polling not in scope but may be needed. On disconnect, query continues in background — user can refresh.

2. **MCE Validation Endpoint**: Undocumented endpoint - behavior may change without notice. Graceful degradation implemented.

3. **Schema Inference Complexity**: Complex SQL with nested subqueries, multiple joins, and expressions may be challenging. Prioritize common cases; default to Text(254) for unknowns.

4. **Type Inference Edge Cases**: Some SQL constructs (nested CASE, complex expressions) may not infer correctly. Default to Text(254) is safe fallback.

5. **Table/Column Validation**: This spec assumes SQL references valid tables and has no duplicate column names. Linting for these is a separate PR.

## Notes

- All file paths are absolute as required
- Tests are intentionally limited to prevent scope creep
- Existing backend infrastructure (ShellQueryController, ShellQueryService, ShellQueryProcessor) is leveraged heavily
- Frontend auth store already supports csrfToken - just needs interceptor wiring

## Security Notes

- **Do not log raw SQL text** - SQL may contain PII (email addresses, names in WHERE clauses). Log only SQL hash for correlation.
- **CSRF token in memory only** - Never persist to localStorage or sessionStorage. Store only in Zustand (in-memory).
- **Error messages** - Display MCE errors directly (they're user-facing). Never expose stack traces or internal details.

## Test Summary (Task Group 7)

### Query Execution Feature Test Count

| Category | Tests |
|----------|-------|
| **Web Tests** | |
| CSRF Token Tests (api.test.ts) | 4 |
| useQueryExecution Hook Tests | 12 |
| Query Execution Integration Tests | 8 |
| ResultsPane Component Tests | 16 |
| **API Tests** | |
| Shell Query Controller Tests (getRunStatus) | 4 |
| Shell Query Service Tests | 2 |
| Shell Query SSE Service Tests | 3 |
| Shell Query Producer E2E Tests | 6 |
| Shell Query Notifications E2E Tests | 8 |
| **Worker Tests** | |
| MCE Query Validator Tests | 5 |
| Query Analyzer & Schema Inferrer Tests | 25 |
| Status Events Tests | 5 |
| Shell Query Processor Tests | 3 |
| **Total** | **101** |

All 101 query execution feature tests pass.
