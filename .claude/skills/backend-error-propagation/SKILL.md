---
name: Backend Error Propagation
description: Handle error flow through backend layers (controller → service → repository) following the centralized error architecture. Use this skill when deciding where to catch errors, how to propagate them between layers, implementing retry logic in workers, or when errors need to flow from repositories through services to the GlobalExceptionFilter.
---

## When to use this skill

- When implementing error handling in repository layer (use `DatabaseError`)
- When implementing error handling in service layer (create/propagate `AppError`)
- When deciding whether to catch errors in controllers (don't - let filter handle)
- When implementing retry logic in workers (use `isTerminal()`, `isUnrecoverable()`)
- When errors need to propagate through multiple service layers
- When wrapping external provider errors
- When implementing fallback logic with error inspection
- When editing repository files, service files, or worker processors
- When working with BullMQ job processors
- When implementing graceful degradation patterns

# Backend Error Propagation

This skill provides guidance on how errors should flow through backend layers.

## Instructions

For details, refer to the information provided in this file:
[backend error propagation](../../../agent-os/standards/backend/error-propagation.md)
