import { getDbFromContext } from './db-context';

export function createDbProxy<T extends object>(defaultDb: T): T {
  return new Proxy(defaultDb as object, {
    get(_target, property, _receiver) {
      const activeDb = (getDbFromContext() as T | undefined) ?? defaultDb;
      const value = (activeDb as any)[property];
      if (typeof value === 'function') return value.bind(activeDb);
      return value;
    },
  }) as T;
}

