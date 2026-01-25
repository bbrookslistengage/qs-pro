## API Endpoint Standards

### RESTful Design

- **Resource-Based URLs**: Use clear resource-based URLs with appropriate HTTP methods (GET, POST, PUT, PATCH, DELETE)
- **Consistent Naming**: Use lowercase, hyphenated naming for endpoints (`/data-extensions`, not `/dataExtensions`)
- **Plural Nouns**: Use plural nouns for resource endpoints (`/users`, `/queries`)
- **Nested Resources**: Limit nesting to 2-3 levels (`/tenants/:id/users`, not `/tenants/:id/users/:userId/queries/:queryId/results`)
- **Query Parameters**: Use query parameters for filtering, sorting, pagination (`?page=1&limit=20&sort=created_at`)

### Error Response Format (RFC 9457)

All error responses use **RFC 9457 Problem Details** format. The `GlobalExceptionFilter` handles this automatically.

```typescript
// Response format
interface ProblemDetails {
  type: string;      // URN identifier: "urn:qpp:error:resource-not-found"
  title: string;     // Human-readable title: "Resource Not Found"
  status: number;    // HTTP status code: 404
  detail: string;    // User-facing message from ErrorMessages
  instance: string;  // Request path: "/api/users/123"
  // Optional extensions
  violations?: string[];  // For validation errors
  field?: string;         // Field that caused error
  retryAfter?: number;    // Seconds until retry (rate limiting)
}
```

**Example responses:**

```json
// 400 Validation Error
{
  "type": "urn:qpp:error:mce-validation-failed",
  "title": "Query Validation Failed",
  "status": 400,
  "detail": "Query validation failed.",
  "instance": "/api/queries/execute",
  "violations": ["DELETE statement not allowed", "Missing FROM clause"]
}

// 401 Authentication Error
{
  "type": "urn:qpp:error:auth-unauthorized",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Authentication required. Please log in.",
  "instance": "/api/metadata"
}

// 500 Internal Error (masked for security)
{
  "type": "urn:qpp:error:internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "An unexpected error occurred",
  "instance": "/api/queries/123"
}
```

### When to Use AppError vs HttpException

| Scenario | Use | Example |
|----------|-----|---------|
| **Domain/business logic errors** | `AppError` | User not found, seat limit exceeded, query validation failed |
| **NestJS framework errors** | `HttpException` | Route guards, pipe validation, interceptors |
| **Input validation (DTO)** | `HttpException` | Class-validator decorators on DTOs |

```typescript
// ✅ Domain error - use AppError
throw new AppError(ErrorCode.RESOURCE_NOT_FOUND);
throw new AppError(ErrorCode.SEAT_LIMIT_EXCEEDED);
throw new AppError(ErrorCode.MCE_VALIDATION_FAILED, null, null, { violations });

// ✅ Framework/DTO validation - HttpException is fine (auto-handled)
// class-validator errors are converted by ValidationPipe

// ❌ Don't use HttpException for domain errors
throw new NotFoundException('User not found');  // Use AppError instead
```

### Controller Best Practices

```typescript
@Controller('queries')
export class QueriesController {
  // ✅ Let errors propagate to GlobalExceptionFilter
  @Post('execute')
  async execute(@Body() dto: ExecuteQueryDto) {
    return this.queriesService.execute(dto);
    // Service throws AppError → Filter converts to RFC 9457
  }

  // ❌ Don't catch and re-throw with HttpException
  @Post('execute')
  async executeBad(@Body() dto: ExecuteQueryDto) {
    try {
      return this.queriesService.execute(dto);
    } catch (error) {
      throw new BadRequestException(error.message); // Loses error code!
    }
  }
}
```

### HTTP Status Codes

Status codes are automatically mapped by `getHttpStatus()` in error-policy.ts. Don't manually set them.

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST that creates resource |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation errors, malformed requests |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | State conflict (e.g., duplicate) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server errors |
| 502 | Bad Gateway | Upstream service (MCE) error |
