import { Test, TestingModule } from '@nestjs/testing';
import { ShellQueryProcessor } from '../src/shell-query/shell-query.processor';
import { ShellQuerySweeper } from '../src/shell-query/shell-query.sweeper';
import { RunToTempFlow } from '../src/shell-query/strategies/run-to-temp.strategy';
import { RlsContextService, MceBridgeService } from '@qs-pro/backend-shared';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockBullJob } from './factories';
import { createDbStub, createMceBridgeStub, createRedisStub, createMetricsStub, createRlsContextStub } from './stubs';

describe('Shell Query Cancellation & Sweeper', () => {
  let processor: ShellQueryProcessor;
  let sweeper: ShellQuerySweeper;
  let mockDb: ReturnType<typeof createDbStub>;
  let mockMceBridge: ReturnType<typeof createMceBridgeStub>;
  let mockRedis: ReturnType<typeof createRedisStub>;

  beforeEach(async () => {
    mockDb = createDbStub();
    mockMceBridge = createMceBridgeStub();
    mockRedis = createRedisStub();
    const mockMetrics = createMetricsStub();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShellQueryProcessor,
        ShellQuerySweeper,
        { provide: RunToTempFlow, useValue: { execute: vi.fn().mockResolvedValue({ taskId: 'task-123' }) } },
        { provide: MceBridgeService, useValue: mockMceBridge },
        { provide: RlsContextService, useValue: createRlsContextStub() },
        { provide: 'DATABASE', useValue: mockDb },
        { provide: 'REDIS_CLIENT', useValue: mockRedis },
        { provide: 'METRICS_JOBS_TOTAL', useValue: mockMetrics },
        { provide: 'METRICS_DURATION', useValue: mockMetrics },
        { provide: 'METRICS_FAILURES_TOTAL', useValue: mockMetrics },
        { provide: 'METRICS_ACTIVE_JOBS', useValue: mockMetrics },
      ],
    }).compile();

    processor = module.get<ShellQueryProcessor>(ShellQueryProcessor);
    sweeper = module.get<ShellQuerySweeper>(ShellQuerySweeper);
    processor.setPollingDelayMultiplier(0);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Cancellation', () => {
    it('should stop polling when job status changes to canceled in DB', async () => {
      const job = createMockBullJob();

      // First poll: still running, second check: canceled
      let pollCount = 0;
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => {
            pollCount++;
            return pollCount === 1 ? [{ status: 'running' }] : [{ status: 'canceled' }];
          }),
        })),
      }));

      // First poll returns Processing
      mockMceBridge.soapRequest.mockResolvedValueOnce({
        Body: { RetrieveResponseMsg: { Results: { Status: 'Processing' } } }
      });

      await processor.process(job as any);

      // Should have published canceled event
      expect(mockRedis.publish).toHaveBeenCalledWith(
        expect.stringContaining('run-status:'),
        expect.stringContaining('canceled')
      );
    });

    it('should attempt cleanup even when canceled', async () => {
      const job = createMockBullJob();

      // Immediately canceled
      mockDb.setSelectResult([{ status: 'canceled' }]);

      await processor.process(job as any);

      // Cleanup should be attempted (DeleteRequest for QueryDefinition)
      expect(mockMceBridge.soapRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.stringContaining('DeleteRequest'),
        'Delete'
      );
    });
  });

  describe('Sweeper', () => {
    it('should query QPP folder and delete old QueryDefinitions', async () => {
      // Setup credentials
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => [{ tenantId: 't1', userId: 'u1', mid: 'm1' }]),
      }));

      // Folder search returns folder
      mockMceBridge.soapRequest
        .mockResolvedValueOnce({ Body: { RetrieveResponseMsg: { Results: { ID: 'folder-123' } } } })
        // Query search returns old queries
        .mockResolvedValueOnce({
          Body: { RetrieveResponseMsg: { Results: [
            { CustomerKey: 'QPP_Query_old-run-1', Name: 'QPP_Query_old-run-1' }
          ] } }
        })
        // Delete calls succeed
        .mockResolvedValue({ Body: { DeleteResponse: { Results: { StatusCode: 'OK' } } } });

      await sweeper.handleSweep();

      // Should have called delete for the old query
      expect(mockMceBridge.soapRequest).toHaveBeenCalledWith(
        't1', 'u1', 'm1',
        expect.stringContaining('DeleteRequest'),
        'Delete'
      );
    });

    it('should handle empty folder gracefully', async () => {
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => [{ tenantId: 't1', userId: 'u1', mid: 'm1' }]),
      }));

      // No folder found
      mockMceBridge.soapRequest.mockResolvedValueOnce({
        Body: { RetrieveResponseMsg: { Results: null } }
      });

      // Should not throw
      await expect(sweeper.handleSweep()).resolves.not.toThrow();
    });
  });
});
