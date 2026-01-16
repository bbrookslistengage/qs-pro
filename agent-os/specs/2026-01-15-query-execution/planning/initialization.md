# Spec Initialization: Query Execution (Web-API-Worker)

## Initial Idea

Wire the frontend editor "RUN" button to the backend shell query execution system, enabling end-to-end query execution flow from web frontend through API to worker backend with real-time status streaming and paginated results display.

## Context from Orchestrator

This is the critical path for QS Pro (Query++) - an ISV-grade SQL IDE for Salesforce Marketing Cloud Engagement (MCE). The feature connects:

1. **Frontend**: Monaco-based editor with existing RUN button and ResultsPane UI
2. **API**: NestJS shell-query endpoints (`POST /api/runs`, `GET /api/runs/:runId/events` SSE, `GET /api/runs/:runId/results`)
3. **Worker**: BullMQ processor that orchestrates MCE SOAP/REST calls for query execution

## What Already Exists

### Backend (API + Worker) - Implemented
- `POST /api/runs` - Creates a run, validates, queues job
- `GET /api/runs/:runId/events` - SSE endpoint for real-time status
- `GET /api/runs/:runId/results` - Paginated results proxy to MCE REST API
- `POST /api/runs/:runId/cancel` - Cancel a running query
- ShellQueryProcessor - BullMQ worker with polling, metrics, cleanup
- Rate limiting: 10 concurrent runs per user, 5 SSE connections per user
- Database: `shell_query_runs` table with status tracking

### Frontend - Partially Implemented
- EditorWorkspace with RUN button (currently calls `onRun?.("temp")` but not wired to API)
- ResultsPane UI with pagination controls
- ExecutionResult type with status, columns, rows, pagination
- API client (`/apps/web/src/services/api.ts`) with axios + interceptors

### Not Yet Implemented
- Frontend hook/service to call `/api/runs` and handle SSE
- Wiring EditorWorkspacePage to actually execute queries
- CSRF token attachment for state-changing requests
- Error handling and user-friendly messages for MCE errors
