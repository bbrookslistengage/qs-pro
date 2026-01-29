import { HttpException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminAuthMiddleware } from "../admin-auth.middleware";

describe("AdminAuthMiddleware", () => {
  let middleware: AdminAuthMiddleware;
  let mockConfigService: { get: ReturnType<typeof vi.fn> };
  let mockNext: ReturnType<typeof vi.fn>;

  const VALID_ADMIN_KEY = "test-admin-key-12345";

  const createMockRequest = (
    headers: Record<string, string | undefined> = {},
  ): FastifyRequest => ({ headers }) as FastifyRequest;

  const createMockResponse = (): FastifyReply => ({}) as FastifyReply;

  /**
   * Helper to capture HttpException details for assertion.
   * Avoids conditional expects inside try/catch blocks.
   */
  const captureHttpException = (
    fn: () => void,
  ): { status: number; message: string } | null => {
    let captured: { status: number; message: string } | null = null;
    try {
      fn();
    } catch (error) {
      if (error instanceof HttpException) {
        captured = {
          status: error.getStatus(),
          message: error.message,
        };
      }
    }
    return captured;
  };

  beforeEach(async () => {
    mockConfigService = {
      get: vi.fn(),
    };
    mockNext = vi.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthMiddleware,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    middleware = module.get<AdminAuthMiddleware>(AdminAuthMiddleware);
  });

  it("calls next() when x-admin-key header matches configured ADMIN_API_KEY", () => {
    // Arrange
    mockConfigService.get.mockReturnValue(VALID_ADMIN_KEY);
    const req = createMockRequest({ "x-admin-key": VALID_ADMIN_KEY });
    const res = createMockResponse();

    // Act
    middleware.use(req, res, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalledOnce();
    expect(mockNext).toHaveBeenCalledWith();
  });

  it("throws 401 HttpException when x-admin-key header is missing", () => {
    // Arrange
    mockConfigService.get.mockReturnValue(VALID_ADMIN_KEY);
    const req = createMockRequest({});
    const res = createMockResponse();

    // Act
    const exception = captureHttpException(() =>
      middleware.use(req, res, mockNext),
    );

    // Assert
    expect(exception).toEqual({
      status: HttpStatus.UNAUTHORIZED,
      message: "Unauthorized: Invalid or missing admin API key",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("throws 401 HttpException when x-admin-key header does not match", () => {
    // Arrange
    mockConfigService.get.mockReturnValue(VALID_ADMIN_KEY);
    const req = createMockRequest({ "x-admin-key": "wrong-key" });
    const res = createMockResponse();

    // Act
    const exception = captureHttpException(() =>
      middleware.use(req, res, mockNext),
    );

    // Assert
    expect(exception).toEqual({
      status: HttpStatus.UNAUTHORIZED,
      message: "Unauthorized: Invalid or missing admin API key",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("throws 401 HttpException when ADMIN_API_KEY is not configured", () => {
    // Arrange
    mockConfigService.get.mockReturnValue(undefined);
    const req = createMockRequest({ "x-admin-key": "any-key" });
    const res = createMockResponse();

    // Act
    const exception = captureHttpException(() =>
      middleware.use(req, res, mockNext),
    );

    // Assert
    expect(exception).toEqual({
      status: HttpStatus.UNAUTHORIZED,
      message: "Unauthorized: Admin API key not configured",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});
