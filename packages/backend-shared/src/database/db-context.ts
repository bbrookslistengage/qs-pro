import { AsyncLocalStorage } from "node:async_hooks";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type DbContextStore = {
  db: PostgresJsDatabase<Record<string, unknown>>;
};

const storage = new AsyncLocalStorage<DbContextStore>();

export function runWithDbContext<T>(
  db: PostgresJsDatabase<Record<string, unknown>>,
  fn: () => T,
): T {
  return storage.run({ db }, fn);
}

export function enterWithDbContext(
  db: PostgresJsDatabase<Record<string, unknown>>,
): void {
  storage.enterWith({ db });
}

export function getDbFromContext():
  | PostgresJsDatabase<Record<string, unknown>>
  | undefined {
  return storage.getStore()?.db;
}
