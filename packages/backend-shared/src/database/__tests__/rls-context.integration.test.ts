/**
 * Integration tests for RLS context transaction scope behavior.
 *
 * These tests verify that:
 * 1. SET LOCAL config values apply within the transaction
 * 2. Config values are auto-cleared after COMMIT
 * 3. Connections return to pool with clean state
 * 4. Nested contexts work correctly within the same transaction
 *
 * Requires a running PostgreSQL instance (see vitest-integration.config.ts).
 */
import { Test, TestingModule } from "@nestjs/testing";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle } from "drizzle-orm/postgres-js";
import type { Sql } from "postgres";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDbFromContext, getReservedSqlFromContext } from "../db-context";
import { RlsContextService } from "../rls-context.service";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL environment variable is required for integration tests",
  );
}

describe("RlsContextService Integration", () => {
  let service: RlsContextService;
  let sqlClient: Sql;
  let module: TestingModule;

  beforeAll(async () => {
    sqlClient = postgres(connectionString, { max: 5 });

    module = await Test.createTestingModule({
      providers: [
        RlsContextService,
        {
          provide: "SQL_CLIENT",
          useValue: sqlClient,
        },
        {
          provide: "CREATE_DATABASE_FROM_CLIENT",
          useValue: (
            client: Sql,
          ): PostgresJsDatabase<Record<string, unknown>> =>
            drizzle(client) as unknown as PostgresJsDatabase<
              Record<string, unknown>
            >,
        },
      ],
    }).compile();

    service = module.get<RlsContextService>(RlsContextService);
  });

  afterAll(async () => {
    await module.close();
    await sqlClient.end();
  });

  describe("runWithTenantContext", () => {
    it("should set tenant_id and mid within transaction", async () => {
      const testTenantId = "integration-tenant-123";
      const testMid = "integration-mid-456";

      const result = await service.runWithTenantContext(
        testTenantId,
        testMid,
        async () => {
          const reservedSql = getReservedSqlFromContext();
          if (!reservedSql) {
            throw new Error("Reserved SQL not available in context");
          }

          // Query current_setting within the transaction
          const [tenantRow] =
            await reservedSql`SELECT current_setting('app.tenant_id', true) as value`;
          const [midRow] =
            await reservedSql`SELECT current_setting('app.mid', true) as value`;

          return {
            tenantId: tenantRow?.value,
            mid: midRow?.value,
          };
        },
      );

      expect(result.tenantId).toBe(testTenantId);
      expect(result.mid).toBe(testMid);
    });

    it("should clear context after transaction commits", async () => {
      // First, run with context
      await service.runWithTenantContext(
        "cleared-tenant",
        "cleared-mid",
        async () => {
          // Context is set here
          return "done";
        },
      );

      // After transaction completes, query with a new connection
      // The context should NOT be set
      const [result] =
        await sqlClient`SELECT current_setting('app.tenant_id', true) as value`;

      // current_setting with true returns null/empty for missing settings
      expect(result?.value).toBeFalsy();
    });

    it("should provide database context within callback", async () => {
      await service.runWithTenantContext(
        "db-context-tenant",
        "db-context-mid",
        async () => {
          const db = getDbFromContext();
          const reservedSql = getReservedSqlFromContext();

          expect(db).toBeDefined();
          expect(reservedSql).toBeDefined();
          return "done";
        },
      );
    });

    it("should rollback transaction on error", async () => {
      // Start a transaction that will fail
      await expect(
        service.runWithTenantContext("error-tenant", "error-mid", async () => {
          throw new Error("Intentional test error");
        }),
      ).rejects.toThrow("Intentional test error");

      // Context should still be cleared (via ROLLBACK)
      const [result] =
        await sqlClient`SELECT current_setting('app.tenant_id', true) as value`;
      expect(result?.value).toBeFalsy();
    });
  });

  describe("runWithUserContext", () => {
    it("should set all three context values within transaction", async () => {
      const testTenantId = "user-tenant-123";
      const testMid = "user-mid-456";
      const testUserId = "user-789";

      const result = await service.runWithUserContext(
        testTenantId,
        testMid,
        testUserId,
        async () => {
          const reservedSql = getReservedSqlFromContext();
          if (!reservedSql) {
            throw new Error("Reserved SQL not available in context");
          }

          const [tenantRow] =
            await reservedSql`SELECT current_setting('app.tenant_id', true) as value`;
          const [midRow] =
            await reservedSql`SELECT current_setting('app.mid', true) as value`;
          const [userRow] =
            await reservedSql`SELECT current_setting('app.user_id', true) as value`;

          return {
            tenantId: tenantRow?.value,
            mid: midRow?.value,
            userId: userRow?.value,
          };
        },
      );

      expect(result.tenantId).toBe(testTenantId);
      expect(result.mid).toBe(testMid);
      expect(result.userId).toBe(testUserId);
    });

    it("should clear all context values after transaction commits", async () => {
      await service.runWithUserContext(
        "cleared-tenant",
        "cleared-mid",
        "cleared-user",
        async () => "done",
      );

      // Query with a new connection
      const [tenantResult] =
        await sqlClient`SELECT current_setting('app.tenant_id', true) as value`;
      const [midResult] =
        await sqlClient`SELECT current_setting('app.mid', true) as value`;
      const [userResult] =
        await sqlClient`SELECT current_setting('app.user_id', true) as value`;

      expect(tenantResult?.value).toBeFalsy();
      expect(midResult?.value).toBeFalsy();
      expect(userResult?.value).toBeFalsy();
    });
  });

  describe("nested context", () => {
    it("should allow nested runWithUserContext inside runWithTenantContext", async () => {
      const result = await service.runWithTenantContext(
        "outer-tenant",
        "outer-mid",
        async () => {
          // Now nest runWithUserContext
          const innerResult = await service.runWithUserContext(
            "outer-tenant",
            "outer-mid",
            "nested-user",
            async () => {
              const reservedSql = getReservedSqlFromContext();
              if (!reservedSql) {
                throw new Error("Reserved SQL not available");
              }

              const [tenantRow] =
                await reservedSql`SELECT current_setting('app.tenant_id', true) as value`;
              const [midRow] =
                await reservedSql`SELECT current_setting('app.mid', true) as value`;
              const [userRow] =
                await reservedSql`SELECT current_setting('app.user_id', true) as value`;

              return {
                tenantId: tenantRow?.value,
                mid: midRow?.value,
                userId: userRow?.value,
              };
            },
          );

          return innerResult;
        },
      );

      expect(result.tenantId).toBe("outer-tenant");
      expect(result.mid).toBe("outer-mid");
      expect(result.userId).toBe("nested-user");
    });

    it("should reuse the same reserved connection for nested calls", async () => {
      let outerReservedSql: Sql | undefined;
      let innerReservedSql: Sql | undefined;

      await service.runWithTenantContext("t1", "m1", async () => {
        outerReservedSql = getReservedSqlFromContext();

        await service.runWithUserContext("t1", "m1", "u1", async () => {
          innerReservedSql = getReservedSqlFromContext();
          return "inner";
        });

        return "outer";
      });

      expect(outerReservedSql).toBeDefined();
      expect(innerReservedSql).toBeDefined();
      // Same connection should be reused
      expect(outerReservedSql).toBe(innerReservedSql);
    });
  });

  describe("connection pool hygiene", () => {
    it("should not exhaust connection pool with multiple sequential operations", async () => {
      // Run multiple operations sequentially
      // If connections weren't properly released, this would exhaust the pool (max: 5)
      for (let i = 0; i < 10; i++) {
        await service.runWithTenantContext(
          `tenant-${i}`,
          `mid-${i}`,
          async () => Promise.resolve(`result-${i}`),
        );
      }

      // If we get here without timeout, connections are being released properly
      expect(true).toBe(true);
    });

    it("should release connection even when callback fails", async () => {
      // Run multiple failing operations
      for (let i = 0; i < 10; i++) {
        await expect(
          service.runWithTenantContext(`fail-${i}`, `mid-${i}`, async () => {
            throw new Error(`Fail ${i}`);
          }),
        ).rejects.toThrow(`Fail ${i}`);
      }

      // If we get here, connections are being released even on failure
      expect(true).toBe(true);
    });
  });

  describe("existing context bypass", () => {
    it("should skip context setup when already in a context", async () => {
      let innerSetupCalled = false;

      await service.runWithTenantContext("outer", "outer-mid", async () => {
        // Get the outer reserved SQL
        const outerSql = getReservedSqlFromContext();

        // Call runWithTenantContext again - should NOT reserve new connection
        await service.runWithTenantContext("inner", "inner-mid", async () => {
          const innerSql = getReservedSqlFromContext();
          // Should be the same connection (context reused, no new reservation)
          innerSetupCalled = outerSql === innerSql;
          return "inner";
        });

        return "outer";
      });

      // The inner call should have reused the outer context
      expect(innerSetupCalled).toBe(true);
    });
  });
});
