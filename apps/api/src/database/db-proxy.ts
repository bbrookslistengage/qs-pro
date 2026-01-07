import { getDbFromContext } from './db-context';

export function createDbProxy<T extends object>(defaultDb: T): T {
  return new Proxy(defaultDb, {
    get(target: any, property: string | symbol) {
      const db = getDbFromContext() as any;
      const value = (activeDb as any)[property];
      if (typeof value === 'function') return value.bind(activeDb);
      return value;
    },
  }) as T;
}
