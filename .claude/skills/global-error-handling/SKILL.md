---
name: Global Error Handling
description: Implement robust error handling with user-friendly messages, specific exception types, and graceful degradation patterns. Use this skill when adding try-catch blocks, creating custom error classes, handling API errors, implementing retry logic, or designing error boundaries. Apply when writing error handling code in any layer of the application, from API controllers to frontend components, ensuring errors are handled consistently and informatively.
---

## When to use this skill

- When throwing errors in backend code (use `AppError` with `ErrorCode`)
- When wrapping unknown errors (use `toAppError()`)
- When deciding if an error should be retried (use `isTerminal()`, `isUnrecoverable()`)
- When adding context to errors for debugging
- When creating validation errors with violations
- When editing service files, repository files, or worker processors
- When implementing error handling in async/await or Promise chains
- When implementing graceful degradation for non-critical failures
- When adding retry logic with exponential backoff
- When cleaning up resources in finally blocks

# Global Error Handling

This skill provides guidance on the project's centralized error handling architecture.

## Instructions

For details, refer to the information provided in this file:
[global error handling](../../../agent-os/standards/global/error-handling.md)
