import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ShellQueryProcessor } from '../src/shell-query/shell-query.processor';
import { QueryDefinitionService } from '../src/shell-query/query-definition.service';
import { ShellQuerySweeper } from '../src/shell-query/shell-query.sweeper';
import { RunToTempFlow } from '../src/shell-query/strategies/run-to-temp.strategy';
import { RlsContextService, MceBridgeService } from '@qs-pro/backend-shared';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockBullJob, createMockPollBullJob } from './factories';
import { createDbStub, createMceBridgeStub, createRedisStub, createMetricsStub, createRlsContextStub, createQueueStub, createQueryDefinitionServiceStub, type QueryDefinitionServiceStub } from './stubs';

describe('Shell Query Cancellation & Sweeper', () => {
  let processor: ShellQueryProcessor;
  let sweeper: ShellQuerySweeper;
  let mockDb: ReturnType<typeof createDbStub>;
  let mockMceBridge: ReturnType<typeof createMceBridgeStub>;
  let mockRedis: ReturnType<typeof createRedisStub>;
  let mockQueue: ReturnType<typeof createQueueStub>;
  let mockQueryDefService: QueryDefinitionServiceStub;

  beforeEach(async () => {
    mockDb = createDbStub();
    mockMceBridge = createMceBridgeStub();
    mockRedis = createRedisStub();
    mockQueue = createQueueStub();
    mockQueryDefService = createQueryDefinitionServiceStub();
    const mockMetrics = createMetricsStub();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShellQueryProcessor,
        ShellQuerySweeper,
        {
          provide: RunToTempFlow,
          useValue: {
            execute: vi.fn().mockResolvedValue({
              taskId: 'task-123',
              queryDefinitionId: 'query-def-123',
            }),
          },
        },
        { provide: MceBridgeService, useValue: mockMceBridge },
        { provide: QueryDefinitionService, useValue: mockQueryDefService },
        { provide: RlsContextService, useValue: createRlsContextStub() },
        { provide: 'DATABASE', useValue: mockDb },
        { provide: 'REDIS_CLIENT', useValue: mockRedis },
        { provide: 'METRICS_JOBS_TOTAL', useValue: mockMetrics },
        { provide: 'METRICS_DURATION', useValue: mockMetrics },
        { provide: 'METRICS_FAILURES_TOTAL', useValue: mockMetrics },
        { provide: 'METRICS_ACTIVE_JOBS', useValue: mockMetrics },
        { provide: getQueueToken('shell-query'), useValue: mockQueue },
      ],
    }).compile();

    processor = module.get<ShellQueryProcessor>(ShellQueryProcessor);
    sweeper = module.get<ShellQuerySweeper>(ShellQuerySweeper);
    processor.setTestMode(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Cancellation', () => {
    it('should stop polling when job status changes to canceled in DB', async () => {
      const job = createMockPollBullJob({
        runId: 'run-1',
        tenantId: 't1',
        userId: 'u1',
        mid: 'm1',
      });

      mockDb.setSelectResult([{ status: 'canceled' }]);

      const result = await processor.process(job as any);

      expect(result).toEqual({ status: 'canceled', runId: 'run-1' });
      expect(mockRedis.publish).toHaveBeenCalledWith(
        expect.stringContaining('run-status:'),
        expect.stringContaining('canceled'),
      );
    });

    it('should attempt cleanup when poll job detects cancellation', async () => {
      const job = createMockPollBullJob({
        runId: 'run-1',
        tenantId: 't1',
        userId: 'u1',
        mid: 'm1',
      });

      mockDb.setSelectResult([{ status: 'canceled' }]);

      const result = await processor.process(job as any);

      expect(result).toEqual({ status: 'canceled', runId: 'run-1' });
      expect(mockQueryDefService.deleteByCustomerKey).toHaveBeenCalledWith(
        't1', 'u1', 'm1',
        expect.stringContaining('QPP_Query_'),
      );
    });

    it('should cleanup on execute job failure', async () => {
      const job = createMockBullJob({
        runId: 'run-1',
        tenantId: 't1',
        userId: 'u1',
        mid: 'm1',
      });

      const failureQueryDefService = createQueryDefinitionServiceStub();
      const mockRunToTempFlow = {
        execute: vi.fn().mockRejectedValue(new Error('Flow error')),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ShellQueryProcessor,
          { provide: RunToTempFlow, useValue: mockRunToTempFlow },
          { provide: MceBridgeService, useValue: mockMceBridge },
          { provide: QueryDefinitionService, useValue: failureQueryDefService },
          { provide: RlsContextService, useValue: createRlsContextStub() },
          { provide: 'DATABASE', useValue: mockDb },
          { provide: 'REDIS_CLIENT', useValue: mockRedis },
          { provide: 'METRICS_JOBS_TOTAL', useValue: createMetricsStub() },
          { provide: 'METRICS_DURATION', useValue: createMetricsStub() },
          { provide: 'METRICS_FAILURES_TOTAL', useValue: createMetricsStub() },
          { provide: 'METRICS_ACTIVE_JOBS', useValue: createMetricsStub() },
          { provide: getQueueToken('shell-query'), useValue: mockQueue },
        ],
      }).compile();

      const testProcessor = module.get<ShellQueryProcessor>(ShellQueryProcessor);
      testProcessor.setTestMode(true);

      await expect(testProcessor.process(job as any)).rejects.toThrow('Flow error');

      expect(failureQueryDefService.deleteByCustomerKey).toHaveBeenCalledWith(
        't1', 'u1', 'm1',
        expect.stringContaining('QPP_Query_'),
      );
    });
  });

  describe('Sweeper', () => {
    it('should use stored qppFolderId and delete old QueryDefinitions with ObjectID', async () => {
      let queryCount = 0;
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => {
            queryCount++;
            if (queryCount === 1) {
              return [{ tenantId: 't1', mid: 'm1', qppFolderId: 123 }];
            }
            return {
              limit: vi.fn(() => [{ userId: 'u1' }]),
            };
          }),
        })),
      }));

      mockMceBridge.soapRequest.mockResolvedValueOnce({
        Body: { RetrieveResponseMsg: { Results: [
          { CustomerKey: 'QPP_Query_old-run-1', Name: 'QPP_Query_old-run-1', ObjectID: 'obj-123' },
        ] } },
      });

      await sweeper.handleSweep();

      expect(mockMceBridge.soapRequest).toHaveBeenCalledWith(
        't1', 'u1', 'm1',
        expect.stringContaining('<Value>123</Value>'),
        'Retrieve',
      );
      expect(mockMceBridge.soapRequest).toHaveBeenCalledWith(
        't1', 'u1', 'm1',
        expect.stringContaining('<Properties>ObjectID</Properties>'),
        'Retrieve',
      );
      expect(mockQueryDefService.deleteByCustomerKey).toHaveBeenCalledWith(
        't1', 'u1', 'm1',
        'QPP_Query_old-run-1',
        'obj-123',
      );
    });

    it('should handle no QueryDefinitions gracefully', async () => {
      let queryCount = 0;
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => {
            queryCount++;
            if (queryCount === 1) {
              return [{ tenantId: 't1', mid: 'm1', qppFolderId: 123 }];
            }
            return {
              limit: vi.fn(() => [{ userId: 'u1' }]),
            };
          }),
        })),
      }));

      mockMceBridge.soapRequest.mockResolvedValueOnce({
        Body: { RetrieveResponseMsg: { Results: null } },
      });

      await expect(sweeper.handleSweep()).resolves.not.toThrow();
    });

    it('should handle single object Results (not array) from SOAP response', async () => {
      let queryCount = 0;
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => {
            queryCount++;
            if (queryCount === 1) {
              return [{ tenantId: 't1', mid: 'm1', qppFolderId: 123 }];
            }
            return {
              limit: vi.fn(() => [{ userId: 'u1' }]),
            };
          }),
        })),
      }));

      mockMceBridge.soapRequest.mockResolvedValueOnce({
        Body: { RetrieveResponseMsg: { Results: { CustomerKey: 'QPP_Query_single', Name: 'QPP_Query_single', ObjectID: 'obj-single' } } },
      });

      await sweeper.handleSweep();

      expect(mockQueryDefService.deleteByCustomerKey).toHaveBeenCalledWith(
        't1', 'u1', 'm1',
        'QPP_Query_single',
        'obj-single',
      );
    });
  });
});
