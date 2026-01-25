## Error Handling Architecture

This project uses a centralized error handling system. **Do not use raw `throw new Error()` or ad-hoc error handling.**

### Core Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `AppError` | `@qpp/backend-shared` | Domain error class with typed codes |
| `ErrorCode` | `@qpp/shared-types` | Centralized error code enum |
| `ErrorMessages` | `@qpp/shared-types` | User-facing messages (never expose internals) |
| `error-policy.ts` | `@qpp/backend-shared` | Retry/terminal classification, HTTP mapping |
| `GlobalExceptionFilter` | `apps/api` | Converts exceptions to RFC 9457 responses |

### Creating Domain Errors

```typescript
import { AppError, ErrorCode } from '@qpp/backend-shared';

// Basic usage
throw new AppError(ErrorCode.RESOURCE_NOT_FOUND);

// With cause (for error chaining)
throw new AppError(ErrorCode.MCE_SOAP_FAILURE, originalError);

// With debugging context (logged server-side, NEVER exposed to client)
throw new AppError(ErrorCode.MCE_AUTH_EXPIRED, originalError, {
  tenantId: tenant.id,
  operation: 'fetchDataExtensions',
});

// With client-safe extensions (for validation errors)
throw new AppError(ErrorCode.MCE_VALIDATION_FAILED, null, null, {
  violations: ['DELETE statement not allowed', 'Missing FROM clause'],
});
```

### Error Codes

Use the appropriate `ErrorCode` for your scenario:

| Category | Codes | HTTP Status |
|----------|-------|-------------|
| **Auth** | `AUTH_UNAUTHORIZED`, `AUTH_IDENTITY_MISMATCH` | 401 |
| **MCE HTTP** | `MCE_BAD_REQUEST`, `MCE_AUTH_EXPIRED`, `MCE_FORBIDDEN` | 400, 401, 403 |
| **MCE SOAP** | `MCE_SOAP_FAILURE`, `MCE_PAGINATION_EXCEEDED` | 400, 502 |
| **Validation** | `MCE_VALIDATION_FAILED`, `VALIDATION_ERROR` | 400 |
| **Business** | `SEAT_LIMIT_EXCEEDED`, `RATE_LIMIT_EXCEEDED`, `RESOURCE_NOT_FOUND` | 403, 429, 404 |
| **Infrastructure** | `DATABASE_ERROR`, `REDIS_ERROR`, `CONFIG_ERROR` | 500 |

### Error Policies

Use policy functions for retry/recovery decisions:

```typescript
import { isTerminal, isUnrecoverable, toAppError } from '@qpp/backend-shared';

// In workers/background jobs
const appError = toAppError(error);
if (isTerminal(appError)) {
  // Don't retry - will fail again (validation, auth, business logic)
  return;
}
// Retry transient errors

// In inner loops (probing, fallback)
if (isUnrecoverable(appError)) {
  // Stop ALL processing - fundamental operation broken (auth, config)
  throw appError;
}
// Try another approach
```

### Wrapping Unknown Errors

Always use `toAppError()` to convert unknown errors:

```typescript
import { toAppError } from '@qpp/backend-shared';

try {
  await externalOperation();
} catch (error) {
  const appError = toAppError(error); // Preserves AppError, wraps others as UNKNOWN
  // Now you can use isTerminal(), log consistently, etc.
}
```

### What NOT to Do

```typescript
// ❌ BAD: Raw Error
throw new Error('User not found');

// ✅ GOOD: AppError with code
throw new AppError(ErrorCode.RESOURCE_NOT_FOUND);

// ❌ BAD: Inline error message
throw new AppError(ErrorCode.MCE_VALIDATION_FAILED, null, null, {
  violations: ['Your query has a problem'], // Ad-hoc message
});

// ✅ GOOD: Use ValidationViolations constants
import { ValidationViolations } from '@qpp/backend-shared';
throw new AppError(ErrorCode.MCE_VALIDATION_FAILED, null, null, {
  violations: [ValidationViolations.PROHIBITED_DELETE],
});

// ❌ BAD: Manual HTTP status mapping
response.status(404).json({ error: 'Not found' });

// ✅ GOOD: Let GlobalExceptionFilter handle it
throw new AppError(ErrorCode.RESOURCE_NOT_FOUND);
```
