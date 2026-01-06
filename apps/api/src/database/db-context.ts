import { AsyncLocalStorage } from 'node:async_hooks';

type DbContextStore = {
  db: unknown;
};

const storage = new AsyncLocalStorage<DbContextStore>();

export function runWithDbContext<T>(db: unknown, fn: () => T): T {
  return storage.run({ db }, fn);
}

export function enterWithDbContext(db: unknown): void {
  storage.enterWith({ db });
}

export function getDbFromContext(): unknown | undefined {
  return storage.getStore()?.db;
}
