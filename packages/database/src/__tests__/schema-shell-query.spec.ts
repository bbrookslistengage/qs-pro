import { eq } from "drizzle-orm";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { shellQueryRuns, tenants, tenantSettings, users } from "../schema";

// DATABASE_URL is loaded from root .env via vitest.setup.ts
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL environment variable is required for database tests",
  );
}

describe("Shell Query Engine Schema", () => {
  let db: PostgresJsDatabase;
  let client: postgres.Sql;
  let tenantId: string;
  let userId: string;

  beforeAll(async () => {
    client = postgres(connectionString);
    db = drizzle(client);

    // Setup: Create a tenant and user
    const [tenant] = await db
      .insert(tenants)
      .values({
        eid: "sqe-test-eid",
        tssd: "sqe-test-subdomain",
      })
      .returning();
    if (!tenant) {
      throw new Error("Insert failed");
    }
    tenantId = tenant.id;

    const [user] = await db
      .insert(users)
      .values({
        sfUserId: "sqe-test-user",
        tenantId: tenant.id,
        email: "sqe@test.com",
        name: "SQE Tester",
      })
      .returning();
    if (!user) {
      throw new Error("Insert failed");
    }
    userId = user.id;
  });

  afterAll(async () => {
    // Cleanup
    await db
      .delete(shellQueryRuns)
      .where(eq(shellQueryRuns.tenantId, tenantId));
    await db
      .delete(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenantId));
    await db.delete(users).where(eq(users.tenantId, tenantId));
    await db.delete(tenants).where(eq(tenants.id, tenantId));
    await client.end();
  });

  it("should insert a shell query run with required fields", async () => {
    const runData = {
      tenantId,
      userId,
      mid: "123456",
      sqlTextHash: "hash_of_select_star",
      status: "queued" as const,
    };

    const [run] = await db.insert(shellQueryRuns).values(runData).returning();
    if (!run) {
      throw new Error("Insert failed");
    }

    expect(run.id).toBeDefined();
    expect(run.status).toBe("queued");
    expect(run.createdAt).toBeDefined();
    expect(run.mid).toBe("123456");
  });

  it("should update shell query run status and timestamps", async () => {
    const [run] = await db
      .insert(shellQueryRuns)
      .values({
        tenantId,
        userId,
        mid: "123456",
        sqlTextHash: "hash_for_update",
        status: "queued",
      })
      .returning();
    if (!run) {
      throw new Error("Insert failed");
    }

    const [updated] = await db
      .update(shellQueryRuns)
      .set({
        status: "running",
        startedAt: new Date(),
      })
      .where(eq(shellQueryRuns.id, run.id))
      .returning();
    if (!updated) {
      throw new Error("Update failed");
    }

    expect(updated.status).toBe("running");
    expect(updated.startedAt).toBeDefined();
  });

  it("should upsert tenant settings with qppFolderId", async () => {
    const mid = "123456";
    const folderId = 987654321;

    // Insert
    const [settings] = await db
      .insert(tenantSettings)
      .values({
        tenantId,
        mid,
        qppFolderId: folderId,
      })
      .returning();
    if (!settings) {
      throw new Error("Insert failed");
    }

    expect(settings.qppFolderId).toBe(folderId);
    expect(settings.mid).toBe(mid);

    // Update
    const newFolderId = 111111;
    const [updated] = await db
      .update(tenantSettings)
      .set({ qppFolderId: newFolderId })
      .where(eq(tenantSettings.id, settings.id))
      .returning();
    if (!updated) {
      throw new Error("Update failed");
    }

    expect(updated.qppFolderId).toBe(newFolderId);
  });
});
