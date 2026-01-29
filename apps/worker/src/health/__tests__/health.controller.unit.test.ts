import { getQueueToken } from "@nestjs/bullmq";
import { Test, TestingModule } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HealthController } from "../health.controller";

interface MockRedisClient {
  ping: ReturnType<typeof vi.fn>;
}

interface MockQueue {
  client: Promise<MockRedisClient | null>;
}

function createMockRedisClient(
  pingResponse: string | Promise<string> = "PONG",
): MockRedisClient {
  return {
    ping: vi.fn().mockResolvedValue(pingResponse),
  };
}

function createMockQueue(client: MockRedisClient | null): MockQueue {
  return {
    client: Promise.resolve(client),
  };
}

describe("HealthController", () => {
  let controller: HealthController;
  let mockQueue: MockQueue;
  let mockSqlClient: object | null;

  async function createTestModule(): Promise<TestingModule> {
    return Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: getQueueToken("shell-query"), useValue: mockQueue },
        { provide: "SQL_CLIENT", useValue: mockSqlClient },
      ],
    }).compile();
  }

  beforeEach(() => {
    mockQueue = createMockQueue(createMockRedisClient("PONG"));
    mockSqlClient = {};
  });

  describe("check()", () => {
    it("returns redis status 'up' when Redis client responds with PONG", async () => {
      // Arrange
      const module = await createTestModule();
      controller = module.get<HealthController>(HealthController);

      // Act
      const result = await controller.check();

      // Assert
      expect(result.redis).toBe("up");
    });

    it("returns redis status 'down' when Redis ping times out", async () => {
      // Arrange
      const mockClient = createMockRedisClient();
      mockClient.ping.mockResolvedValue("TIMEOUT");
      mockQueue = createMockQueue(mockClient);
      const module = await createTestModule();
      controller = module.get<HealthController>(HealthController);

      // Act
      const result = await controller.check();

      // Assert
      expect(result.redis).toBe("down");
    });

    it("returns redis status 'down' when queue client access times out", async () => {
      // Arrange
      mockQueue = createMockQueue(null);
      const module = await createTestModule();
      controller = module.get<HealthController>(HealthController);

      // Act
      const result = await controller.check();

      // Assert
      expect(result.redis).toBe("down");
    });

    it("returns db status 'up' when sqlClient is truthy", async () => {
      // Arrange
      mockSqlClient = { connected: true };
      const module = await createTestModule();
      controller = module.get<HealthController>(HealthController);

      // Act
      const result = await controller.check();

      // Assert
      expect(result.db).toBe("up");
    });

    it("returns db status 'down' when sqlClient is null", async () => {
      // Arrange
      mockSqlClient = null;
      const module = await createTestModule();
      controller = module.get<HealthController>(HealthController);

      // Act
      const result = await controller.check();

      // Assert
      expect(result.db).toBe("down");
    });

    it("returns response with expected health check shape", async () => {
      // Arrange
      const module = await createTestModule();
      controller = module.get<HealthController>(HealthController);

      // Act
      const result = await controller.check();

      // Assert
      expect(result).toEqual({
        status: "ok",
        redis: "up",
        db: "up",
        timestamp: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        ),
      });
    });
  });
});
