import { vi } from 'vitest';
import { ShellQueryJob } from '../../src/shell-query/shell-query.types';

// Job factory
export function createMockJob(overrides: Partial<ShellQueryJob> = {}): ShellQueryJob {
  return {
    runId: 'run-test-123',
    tenantId: 'tenant-1',
    userId: 'user-1',
    mid: 'mid-1',
    eid: 'eid-1',
    sqlText: 'SELECT SubscriberKey FROM _Subscribers',
    snippetName: 'Test Query',
    ...overrides,
  };
}

// BullMQ Job wrapper factory
export function createMockBullJob(data: Partial<ShellQueryJob> = {}) {
  return {
    id: '1',
    data: createMockJob(data),
    isPaused: vi.fn().mockResolvedValue(false),
    isActive: vi.fn().mockResolvedValue(true),
  };
}
