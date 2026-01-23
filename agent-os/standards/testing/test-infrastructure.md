# Test Infrastructure

This document describes the test infrastructure for the qs-pro monorepo.

## Overview

Tests are organized using Vitest with a projects-based configuration:
- **Unit tests:** Co-located with source, `.unit.test.ts` suffix
- **Integration tests:** Centralized in `test/` dirs, `.integration.test.ts` suffix
- **E2E tests:** Centralized in `test/` dirs, `.e2e.test.ts` suffix

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific test type from root
pnpm vitest --project unit
pnpm vitest --project integration
pnpm vitest --project e2e

# Run tests for specific package
pnpm --filter api test
pnpm --filter @qpp/web test
pnpm --filter worker test
```

## Shared Test Utilities (@qpp/test-utils)

All test factories and stubs live in `packages/test-utils/`.

### Factories

Create test entities with unique IDs:

```typescript
import { createMockUserSession, createMockJob, resetFactories } from '@qpp/test-utils';

describe('MyService', () => {
  beforeEach(() => {
    resetFactories(); // Reset counters for test isolation
  });

  it('should work', () => {
    const session = createMockUserSession(); // { userId: 'user-1', ... }
    const job = createMockJob(); // { runId: 'run-1', ... }
  });
});
```

### Available Factories

| Factory | Description |
|---------|-------------|
| `createMockUserSession()` | User session with unique userId, tenantId, mid |
| `createMockShellQueryContext()` | Shell query context with unique IDs + accessToken |
| `createMockShellQueryRun()` | Shell query run record |
| `createMockJob()` | ShellQueryJob data |
| `createMockBullJob()` | BullMQ job wrapper for ShellQueryJob |
| `createMockPollJobData()` | PollShellQueryJob data |
| `createMockPollBullJob()` | BullMQ job wrapper for PollShellQueryJob |

### Stubs

Create mock implementations for dependencies:

```typescript
import { createDbStub, createRedisStub, createMceBridgeStub } from '@qpp/test-utils';

const dbStub = createDbStub();
dbStub.setSelectResult([{ id: 'test' }]); // Configure return values

const redisStub = createRedisStub();
const mceBridgeStub = createMceBridgeStub();
```

### Available Stubs

| Stub | Description |
|------|-------------|
| `createDbStub()` | Drizzle ORM database with select/update/insert chains |
| `createRedisStub()` | Redis with pub/sub, get/set, duplicate |
| `createMceBridgeStub()` | MCE Bridge for SOAP/REST requests |
| `createRestDataServiceStub()` | MCE REST Data API |
| `createAsyncStatusServiceStub()` | MCE Async Status API |
| `createRlsContextStub()` | Row-Level Security context |
| `createQueueStub()` | BullMQ queue |
| `createMetricsStub()` | Prometheus metrics |
| `createEncryptionServiceStub()` | Encryption/decryption with 'encrypted:' prefix |
| `createSessionGuardMock()` | NestJS SessionGuard |
| `createTenantRepoStub()` | Tenant repository |
| `createShellQueryServiceStub()` | Shell query service |
| `createShellQueryRunRepoStub()` | Shell query run repository |
| `createShellQuerySseServiceStub()` | Shell query SSE service |
| `createDataFolderServiceStub()` | MCE Data Folder service |
| `createDataExtensionServiceStub()` | MCE Data Extension service |
| `createQueryDefinitionServiceStub()` | MCE Query Definition service |

## Configuration Files

- `vitest.config.ts` - Root config with workspace projects
- `vitest.shared.ts` - Shared base configuration
- `apps/*/vitest.config.ts` - Per-app configs extending shared
- `packages/*/vitest.config.ts` - Per-package configs extending shared

## File Naming Convention

| Test Type | Location | Naming |
|-----------|----------|--------|
| Unit | `src/**/*.unit.test.ts` | Co-located with source |
| Integration | `test/**/*.integration.test.ts` | Centralized test dir |
| E2E | `test/**/*.e2e.test.ts` | Centralized test dir |

## Test Isolation

Always call `resetFactories()` in `beforeEach` to ensure unique IDs between tests:

```typescript
import { resetFactories } from '@qpp/test-utils';

beforeEach(() => {
  resetFactories();
  // ... other setup
});
```

This resets the internal counters that generate unique IDs, ensuring predictable test output.

## Adding New Factories/Stubs

1. Add factory/stub to appropriate file in `packages/test-utils/src/`
2. Export from the index file
3. If factory uses counters, add reset function to `setup/reset.ts`
4. Update this documentation
