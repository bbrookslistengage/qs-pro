import { AsyncLocalStorage } from 'node:async_hooks';

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Sql } from 'postgres';

type DbContextStore = {
  db: PostgresJsDatabase<any>;
  reserved?: Sql;
};

const storage = new AsyncLocalStorage<DbContextStore>();

export function runWithDbContext<T>(
  db: PostgresJsDatabase<any>,
  fn: () => T,
  reserved?: Sql,
): T {
  return storage.run({ db, reserved }, fn);
}

export function enterWithDbContext(db: PostgresJsDatabase<any>): void {
  storage.enterWith({ db });
}

export function getDbFromContext(): PostgresJsDatabase<any> | undefined {
  return storage.getStore()?.db;
}

export function getReservedFromContext(): Sql | undefined {
  return storage.getStore()?.reserved;
}
