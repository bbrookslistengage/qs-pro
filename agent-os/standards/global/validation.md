## Validation Standards

### General Principles

- **Validate on Server Side**: Always validate on the server; never trust client-side validation alone for security or data integrity
- **Client-Side for UX**: Use client-side validation to provide immediate user feedback, but duplicate checks server-side
- **Fail Early**: Validate input as early as possible and reject invalid data before processing
- **Specific Error Messages**: Provide clear, field-specific error messages that help users correct their input
- **Allowlists Over Blocklists**: When possible, define what is allowed rather than trying to block everything that's not

### Validation Error Messages

**Use pre-approved `ValidationViolations` constants** for all validation error messages. These are audited for security and consistency.

```typescript
import { ValidationViolations, AppError, ErrorCode } from '@qpp/backend-shared';

// Available violations
ValidationViolations.PROHIBITED_DELETE    // "DELETE statement not allowed"
ValidationViolations.PROHIBITED_INSERT    // "INSERT statement not allowed"
ValidationViolations.PROHIBITED_UPDATE    // "UPDATE statement not allowed"
ValidationViolations.PROHIBITED_DROP      // "DROP statement not allowed"
ValidationViolations.PROHIBITED_TRUNCATE  // "TRUNCATE statement not allowed"
ValidationViolations.PROHIBITED_EXEC      // "EXEC statement not allowed"
ValidationViolations.PROHIBITED_CREATE    // "CREATE statement not allowed"
ValidationViolations.PROHIBITED_ALTER     // "ALTER statement not allowed"
ValidationViolations.SELECT_STAR_NOT_EXPANDABLE  // "SELECT * could not be expanded..."
ValidationViolations.MISSING_FROM_CLAUSE  // "Query must include a FROM clause"
ValidationViolations.INVALID_SYNTAX       // "Query contains invalid SQL syntax"
```

### Throwing Validation Errors

Always use `AppError` with the appropriate code and violations:

```typescript
// Single violation
throw new AppError(ErrorCode.MCE_VALIDATION_FAILED, null, null, {
  violations: [ValidationViolations.PROHIBITED_DELETE],
});

// Multiple violations
const violations: string[] = [];
if (hasDelete) violations.push(ValidationViolations.PROHIBITED_DELETE);
if (hasInsert) violations.push(ValidationViolations.PROHIBITED_INSERT);
if (violations.length > 0) {
  throw new AppError(ErrorCode.MCE_VALIDATION_FAILED, null, null, { violations });
}

// Generic validation error (non-SQL)
throw new AppError(ErrorCode.VALIDATION_ERROR, null, null, {
  field: 'email',
});
```

### What NOT to Do

```typescript
// ❌ BAD: Inline validation message
throw new AppError(ErrorCode.MCE_VALIDATION_FAILED, null, null, {
  violations: ['You cannot use DELETE here'], // Ad-hoc message
});

// ✅ GOOD: Use constant
throw new AppError(ErrorCode.MCE_VALIDATION_FAILED, null, null, {
  violations: [ValidationViolations.PROHIBITED_DELETE],
});

// ❌ BAD: HttpException for validation
throw new BadRequestException('Invalid query');

// ✅ GOOD: AppError with violations
throw new AppError(ErrorCode.MCE_VALIDATION_FAILED, null, null, {
  violations: [ValidationViolations.INVALID_SYNTAX],
});
```

### Adding New Violation Messages

If you need a new validation message:

1. Add it to `packages/backend-shared/src/common/errors/validation-messages.ts`
2. Ensure the message is user-safe (no internal details)
3. Export the type from the module
