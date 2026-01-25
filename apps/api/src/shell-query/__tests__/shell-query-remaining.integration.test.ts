/**
 * Shell Query Remaining API Gaps Integration Tests
 *
 * Tests remaining behaviors not covered elsewhere:
 * - POST /runs body validation (400 responses)
 * - tableMetadata constraint validation
 * - getResults error states with detailed messages
 *
 * Test Strategy:
 * - Lightweight NestJS module with controller and stubbed dependencies
 * - Focus on Zod schema validation and error response format
 * - Behavioral assertions on HTTP responses
 */
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AppError,
  EncryptionService,
  ErrorCode,
  SessionGuard,
} from '@qpp/backend-shared';
import {
  createRedisStub,
  createSessionGuardMock,
  createShellQueryServiceStub,
  createTenantRepoStub,
  resetFactories,
} from '@qpp/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CsrfGuard } from '../../auth/csrf.guard';
import { configureApp } from '../../configure-app';
import { ShellQueryController } from '../shell-query.controller';
import { ShellQueryService } from '../shell-query.service';
import { ShellQuerySseService } from '../shell-query-sse.service';

describe('Shell Query Remaining API Gaps (integration)', () => {
  let app: NestFastifyApplication;
  let mockShellQueryService: ReturnType<typeof createShellQueryServiceStub>;
  let mockTenantRepo: ReturnType<typeof createTenantRepoStub>;

  beforeEach(async () => {
    resetFactories();
    const mockRedis = createRedisStub();
    mockShellQueryService = createShellQueryServiceStub();
    mockTenantRepo = createTenantRepoStub();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ShellQueryController],
      providers: [
        { provide: ShellQueryService, useValue: mockShellQueryService },
        ShellQuerySseService,
        { provide: 'REDIS_CLIENT', useValue: mockRedis },
        { provide: 'TENANT_REPOSITORY', useValue: mockTenantRepo },
        {
          provide: EncryptionService,
          useValue: {
            encrypt: vi.fn((value: string) => value),
            decrypt: vi.fn((value: string) => value),
          },
        },
      ],
    })
      .overrideGuard(SessionGuard)
      .useValue(createSessionGuardMock())
      .overrideGuard(CsrfGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await configureApp(app, { globalPrefix: false });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await app?.close();
  });

  describe('POST /runs body validation', () => {
    it('returns 400 when sqlText is missing', async () => {
      // Act
      const res = await app.inject({
        method: 'POST',
        url: '/runs',
        payload: {},
      });

      // Assert - observable behavior: 400 with validation error
      expect(res.statusCode).toBe(400);
      expect(res.json().type).toBe('urn:qpp:error:http-400');
    });

    it('returns 400 when sqlText is empty string', async () => {
      // Act
      const res = await app.inject({
        method: 'POST',
        url: '/runs',
        payload: { sqlText: '' },
      });

      // Assert
      expect(res.statusCode).toBe(400);
      expect(res.json().type).toBe('urn:qpp:error:http-400');
    });

    it('returns 400 when sqlText exceeds 100,000 characters', async () => {
      // Arrange - create string just over limit
      const longSqlText = 'SELECT ' + 'x'.repeat(100_001);

      // Act
      const res = await app.inject({
        method: 'POST',
        url: '/runs',
        payload: { sqlText: longSqlText },
      });

      // Assert
      expect(res.statusCode).toBe(400);
      expect(res.json().type).toBe('urn:qpp:error:http-400');
    });

    it('accepts sqlText at exactly 100,000 characters', async () => {
      // Arrange - create string at exactly limit
      const maxSqlText = 'x'.repeat(100_000);

      // Act
      const res = await app.inject({
        method: 'POST',
        url: '/runs',
        payload: { sqlText: maxSqlText },
      });

      // Assert - should pass validation (may fail later but not with 400 validation error)
      expect(res.statusCode).not.toBe(400);
    });

    it('returns 400 when snippetName exceeds 1000 characters', async () => {
      // Arrange
      const longSnippetName = 'a'.repeat(1001);

      // Act
      const res = await app.inject({
        method: 'POST',
        url: '/runs',
        payload: {
          sqlText: 'SELECT 1',
          snippetName: longSnippetName,
        },
      });

      // Assert
      expect(res.statusCode).toBe(400);
      expect(res.json().type).toBe('urn:qpp:error:http-400');
    });

    it('accepts snippetName at exactly 1000 characters', async () => {
      // Arrange
      const maxSnippetName = 'a'.repeat(1000);

      // Act
      const res = await app.inject({
        method: 'POST',
        url: '/runs',
        payload: {
          sqlText: 'SELECT 1',
          snippetName: maxSnippetName,
        },
      });

      // Assert - should pass validation
      expect(res.statusCode).not.toBe(400);
    });

    it('returns 400 when tableMetadata has more than 50 tables', async () => {
      // Arrange - create 51 tables
      const tableMetadata: Record<string, unknown[]> = {};
      for (let i = 0; i < 51; i++) {
        tableMetadata[`Table${i}`] = [{ Name: 'Field1', FieldType: 'Text' }];
      }

      // Act
      const res = await app.inject({
        method: 'POST',
        url: '/runs',
        payload: {
          sqlText: 'SELECT 1',
          tableMetadata,
        },
      });

      // Assert
      expect(res.statusCode).toBe(400);
      expect(res.json().type).toBe('urn:qpp:error:http-400');
    });

    it('accepts tableMetadata with exactly 50 tables', async () => {
      // Arrange - create exactly 50 tables
      const tableMetadata: Record<string, unknown[]> = {};
      for (let i = 0; i < 50; i++) {
        tableMetadata[`Table${i}`] = [{ Name: 'Field1', FieldType: 'Text' }];
      }

      // Act
      const res = await app.inject({
        method: 'POST',
        url: '/runs',
        payload: {
          sqlText: 'SELECT 1',
          tableMetadata,
        },
      });

      // Assert - should pass validation
      expect(res.statusCode).not.toBe(400);
    });

    it('returns 400 when tableMetadata field has name longer than 128 characters', async () => {
      // Arrange
      const longFieldName = 'x'.repeat(129);
      const tableMetadata = {
        TestTable: [{ Name: longFieldName, FieldType: 'Text' }],
      };

      // Act
      const res = await app.inject({
        method: 'POST',
        url: '/runs',
        payload: {
          sqlText: 'SELECT 1',
          tableMetadata,
        },
      });

      // Assert
      expect(res.statusCode).toBe(400);
      expect(res.json().type).toBe('urn:qpp:error:http-400');
    });

    it('returns 400 when tableMetadata table name exceeds 128 characters', async () => {
      // Arrange
      const longTableName = 't'.repeat(129);
      const tableMetadata = {
        [longTableName]: [{ Name: 'Field1', FieldType: 'Text' }],
      };

      // Act
      const res = await app.inject({
        method: 'POST',
        url: '/runs',
        payload: {
          sqlText: 'SELECT 1',
          tableMetadata,
        },
      });

      // Assert
      expect(res.statusCode).toBe(400);
      expect(res.json().type).toBe('urn:qpp:error:http-400');
    });

    it('returns 400 when tableMetadata has more than 500 fields per table', async () => {
      // Arrange - create 501 fields
      const fields = Array.from({ length: 501 }, (_, i) => ({
        Name: `Field${i}`,
        FieldType: 'Text',
      }));
      const tableMetadata = {
        TestTable: fields,
      };

      // Act
      const res = await app.inject({
        method: 'POST',
        url: '/runs',
        payload: {
          sqlText: 'SELECT 1',
          tableMetadata,
        },
      });

      // Assert
      expect(res.statusCode).toBe(400);
      expect(res.json().type).toBe('urn:qpp:error:http-400');
    });

    it('validation error includes details about the violation', async () => {
      // Act
      const res = await app.inject({
        method: 'POST',
        url: '/runs',
        payload: {},
      });

      // Assert - error response should contain detail
      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.type).toBe('urn:qpp:error:http-400');
      expect(body.detail).toBeTruthy();
    });
  });

  describe('GET /runs/:runId/results error states', () => {
    it('returns 409 when run is in failed state', async () => {
      // Arrange - service throws INVALID_STATE for failed run
      mockShellQueryService.getResults.mockRejectedValue(
        new AppError(ErrorCode.INVALID_STATE, undefined, {
          operation: 'getResults',
          status: 'failed',
          statusMessage: 'Query execution failed: Invalid column reference',
        }),
      );

      // Act
      const res = await app.inject({
        method: 'GET',
        url: '/runs/failed-run-id/results?page=1',
      });

      // Assert
      expect(res.statusCode).toBe(409);
      const body = res.json();
      expect(body.type).toBe('urn:qpp:error:invalid-state');
    });

    it('returns 409 when run is in running state', async () => {
      // Arrange - service throws INVALID_STATE for running run
      mockShellQueryService.getResults.mockRejectedValue(
        new AppError(ErrorCode.INVALID_STATE, undefined, {
          operation: 'getResults',
          status: 'running',
        }),
      );

      // Act
      const res = await app.inject({
        method: 'GET',
        url: '/runs/running-run-id/results?page=1',
      });

      // Assert
      expect(res.statusCode).toBe(409);
      expect(res.json().type).toBe('urn:qpp:error:invalid-state');
    });

    it('returns 409 when run is in queued state', async () => {
      // Arrange
      mockShellQueryService.getResults.mockRejectedValue(
        new AppError(ErrorCode.INVALID_STATE, undefined, {
          operation: 'getResults',
          status: 'queued',
        }),
      );

      // Act
      const res = await app.inject({
        method: 'GET',
        url: '/runs/queued-run-id/results?page=1',
      });

      // Assert
      expect(res.statusCode).toBe(409);
      expect(res.json().type).toBe('urn:qpp:error:invalid-state');
    });

    it('returns 404 when run does not exist', async () => {
      // Arrange - service throws RESOURCE_NOT_FOUND
      mockShellQueryService.getResults.mockRejectedValue(
        new AppError(ErrorCode.RESOURCE_NOT_FOUND, undefined, {
          operation: 'getResults',
          runId: 'non-existent-run',
        }),
      );

      // Act
      const res = await app.inject({
        method: 'GET',
        url: '/runs/non-existent-run/results?page=1',
      });

      // Assert
      expect(res.statusCode).toBe(404);
      expect(res.json().type).toBe('urn:qpp:error:resource-not-found');
    });
  });

  describe('POST /runs happy path validation', () => {
    it('creates run with valid minimal payload', async () => {
      // Arrange
      mockShellQueryService.createRun.mockResolvedValue('new-run-id');

      // Act
      const res = await app.inject({
        method: 'POST',
        url: '/runs',
        payload: {
          sqlText: 'SELECT Name FROM Subscribers',
        },
      });

      // Assert
      expect(res.statusCode).toBe(201);
      expect(res.json()).toEqual({
        runId: 'new-run-id',
        status: 'queued',
      });
    });

    it('creates run with full payload including tableMetadata', async () => {
      // Arrange
      mockShellQueryService.createRun.mockResolvedValue('new-run-id');

      // Act
      const res = await app.inject({
        method: 'POST',
        url: '/runs',
        payload: {
          sqlText: 'SELECT Name, Email FROM Subscribers',
          snippetName: 'My Subscriber Query',
          tableMetadata: {
            Subscribers: [
              { Name: 'Name', FieldType: 'Text', MaxLength: 100 },
              { Name: 'Email', FieldType: 'EmailAddress', MaxLength: 254 },
            ],
          },
        },
      });

      // Assert
      expect(res.statusCode).toBe(201);
      expect(res.json().runId).toBe('new-run-id');
      expect(res.json().status).toBe('queued');
    });

    it('returns 500 when tenant is not found', async () => {
      mockTenantRepo.findById.mockResolvedValueOnce(null);

      const res = await app.inject({
        method: 'POST',
        url: '/runs',
        payload: {
          sqlText: 'SELECT 1',
        },
      });

      expect(res.statusCode).toBe(500);
      expect(res.json().type).toBe('urn:qpp:error:http-500');
    });

    it('passes validated data to service', async () => {
      // Arrange
      mockShellQueryService.createRun.mockResolvedValue('run-123');

      // Act
      await app.inject({
        method: 'POST',
        url: '/runs',
        payload: {
          sqlText: 'SELECT 1',
          snippetName: 'Test Query',
        },
      });

      // Assert - service called with correct parameters
      expect(mockShellQueryService.createRun).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          userId: 'user-1',
          mid: 'mid-1',
        }),
        'SELECT 1',
        'Test Query',
        undefined,
      );
    });
  });
});
