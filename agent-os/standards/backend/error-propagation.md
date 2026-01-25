## Error Propagation Patterns

This document defines how errors should flow through the backend layers.

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│  GlobalExceptionFilter                                       │
│  - Catches ALL exceptions                                    │
│  - Converts to RFC 9457 ProblemDetails                       │
│  - Logs with appropriate severity                            │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ AppError / HttpException
┌─────────────────────────────────────────────────────────────┐
│  Controller Layer                                            │
│  - Thin: delegates to services                               │
│  - Does NOT catch domain errors                              │
│  - Let errors propagate to filter                            │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ AppError
┌─────────────────────────────────────────────────────────────┐
│  Service Layer                                               │
│  - Business logic and orchestration                          │
│  - Creates AppError for business rule violations             │
│  - Lets repository/provider errors propagate                 │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ AppError / DatabaseError
┌─────────────────────────────────────────────────────────────┐
│  Repository / Provider Layer                                 │
│  - Data access and external service calls                    │
│  - Throws DatabaseError for DB failures                      │
│  - Throws AppError for MCE/external service errors           │
└─────────────────────────────────────────────────────────────┘
```

### Repository Layer

```typescript
// Repositories throw DatabaseError (from @qpp/database)
// It gets auto-wrapped to AppError by toAppError()

import { DatabaseError } from '@qpp/database';
import { ErrorCode } from '@qpp/shared-types';

class UserRepository {
  async findById(id: string): Promise<User | null> {
    try {
      return await this.db.query.users.findFirst({ where: eq(users.id, id) });
    } catch (error) {
      // DatabaseError preserves context for debugging
      throw new DatabaseError(ErrorCode.DATABASE_ERROR, error, {
        operation: 'findById',
        table: 'users',
      });
    }
  }
}
```

### Service Layer

```typescript
import { AppError, ErrorCode, toAppError, isUnrecoverable } from '@qpp/backend-shared';

class UserService {
  // ✅ Create AppError for business logic violations
  async createUser(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new AppError(ErrorCode.INVALID_STATE, null, {
        reason: 'email_exists',
      });
    }

    const seatCount = await this.userRepo.countByTenant(dto.tenantId);
    if (seatCount >= tenant.maxSeats) {
      throw new AppError(ErrorCode.SEAT_LIMIT_EXCEEDED);
    }

    return this.userRepo.create(dto);
    // Let DatabaseError propagate - don't catch it here
  }

  // ✅ Use toAppError() when you need to inspect the error
  async executeWithFallback(): Promise<Result> {
    try {
      return await this.primaryProvider.execute();
    } catch (error) {
      const appError = toAppError(error);
      if (isUnrecoverable(appError)) {
        throw appError; // Auth/config issues - don't try fallback
      }
      return await this.fallbackProvider.execute();
    }
  }
}
```

### Controller Layer

```typescript
@Controller('users')
export class UsersController {
  // ✅ GOOD: Thin controller, let errors propagate
  @Post()
  async create(@Body() dto: CreateUserDto): Promise<User> {
    return this.usersService.create(dto);
  }

  // ❌ BAD: Catching and re-throwing loses error context
  @Post()
  async createBad(@Body() dto: CreateUserDto): Promise<User> {
    try {
      return this.usersService.create(dto);
    } catch (error) {
      throw new BadRequestException('Failed to create user');
    }
  }
}
```

### Worker/Background Job Layer

```typescript
import { isTerminal, isUnrecoverable, toAppError } from '@qpp/backend-shared';

@Processor('queries')
export class QueryProcessor {
  @Process()
  async process(job: Job): Promise<void> {
    try {
      await this.queryService.execute(job.data);
    } catch (error) {
      const appError = toAppError(error);

      if (isTerminal(appError)) {
        // Don't retry: validation, auth, business logic errors
        // Log and mark job as failed
        this.logger.warn(`Terminal error: ${appError.code}`, appError.context);
        throw new UnrecoverableError(appError.message);
      }

      // Transient error: let BullMQ retry
      throw error;
    }
  }
}
```

### What NOT to Do

```typescript
// ❌ Swallowing errors silently
try {
  await riskyOperation();
} catch {
  // Silent failure - debugging nightmare
}

// ❌ Generic error wrapping that loses context
catch (error) {
  throw new Error('Something went wrong');
}

// ❌ Catching in controller just to log
@Get(':id')
async findOne(@Param('id') id: string) {
  try {
    return this.service.findOne(id);
  } catch (error) {
    this.logger.error(error); // GlobalExceptionFilter already logs!
    throw error;
  }
}

// ❌ Converting AppError to HttpException
catch (error) {
  if (error instanceof AppError) {
    throw new BadRequestException(error.message); // Loses error code!
  }
}
```
