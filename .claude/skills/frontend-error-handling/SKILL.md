---
name: Frontend Error Handling
description: Handle HTTP errors using the centralized Axios interceptors in api.ts. Use this skill when adding error handling to API calls, implementing authentication error flows, displaying error messages to users, or working with the API client. The existing interceptors handle 401 refresh, CSRF tokens, and common error codes automatically.
---

## When to use this skill

- When adding error handling to API calls (check if interceptor already handles it)
- When implementing 401/authentication error flows (interceptor handles refresh)
- When displaying error toast messages (avoid duplicating interceptor toasts)
- When handling specific error codes like `SEAT_LIMIT_EXCEEDED`
- When attaching CSRF tokens (interceptor does this automatically)
- When working with TanStack Query error handling
- When implementing inline validation error display from RFC 9457 violations
- When editing files in services/, hooks/, or components that make API calls
- When deciding between global and component-level error handling
- When working with the Axios API client (`apps/web/src/services/api.ts`)

# Frontend Error Handling

This skill provides guidance on the centralized frontend error handling architecture.

## Instructions

For details, refer to the information provided in this file:
[frontend error handling](../../../agent-os/standards/frontend/error-handling.md)
