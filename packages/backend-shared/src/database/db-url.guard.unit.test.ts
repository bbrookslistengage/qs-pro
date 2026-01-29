import { afterEach, describe, expect, it } from "vitest";

import { assertSafeRuntimeDatabaseUrl } from "./db-url.guard";

const originalNodeEnv = process.env.NODE_ENV;
const originalMigrateUser = process.env.QS_DB_MIGRATE_USER;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  if (originalMigrateUser === undefined) {
    delete process.env.QS_DB_MIGRATE_USER;
  } else {
    process.env.QS_DB_MIGRATE_USER = originalMigrateUser;
  }
});

describe("assertSafeRuntimeDatabaseUrl", () => {
  it("throws in production when DATABASE_URL uses qs_migrate", () => {
    process.env.NODE_ENV = "production";
    delete process.env.QS_DB_MIGRATE_USER;

    expect(() =>
      assertSafeRuntimeDatabaseUrl(
        "postgres://qs_migrate:pass@localhost:5432/qs_pro",
      ),
    ).toThrow(/DATABASE_URL user 'qs_migrate'/);
  });

  it("does not throw in production when DATABASE_URL uses a runtime role", () => {
    process.env.NODE_ENV = "production";

    expect(() =>
      assertSafeRuntimeDatabaseUrl(
        "postgres://qs_runtime:pass@localhost:5432/qs_pro",
      ),
    ).not.toThrow();
  });

  it("does not throw outside production", () => {
    process.env.NODE_ENV = "development";

    expect(() =>
      assertSafeRuntimeDatabaseUrl(
        "postgres://qs_migrate:pass@localhost:5432/qs_pro",
      ),
    ).not.toThrow();
  });

  it("uses QS_DB_MIGRATE_USER when provided", () => {
    process.env.NODE_ENV = "production";
    process.env.QS_DB_MIGRATE_USER = "custom_migrate";

    expect(() =>
      assertSafeRuntimeDatabaseUrl(
        "postgres://custom_migrate:pass@localhost:5432/qs_pro",
      ),
    ).toThrow(/DATABASE_URL user 'custom_migrate'/);
  });

  it("does not throw when connection string cannot be parsed", () => {
    process.env.NODE_ENV = "production";

    expect(() => assertSafeRuntimeDatabaseUrl("not-a-url")).not.toThrow();
  });

  it.each([
    "postgres",
    "admin",
    "root",
    "superuser",
    "rdsadmin",
    "cloudsqladmin",
    "azure_superuser",
    "POSTGRES", // case insensitive
    "Admin",
  ])("throws in production when DATABASE_URL uses superuser '%s'", (user) => {
    process.env.NODE_ENV = "production";

    expect(() =>
      assertSafeRuntimeDatabaseUrl(
        `postgres://${user}:pass@localhost:5432/qs_pro`,
      ),
    ).toThrow(/Superuser\/admin roles bypass row-level security/);
  });
});
