import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export const createDatabase = (connectionString: string) => {
  const client = postgres(connectionString);
  return drizzle(client);
};

export * from 'drizzle-orm';
export * from './schema';
export * from './crypto';
export * from './interfaces';
export * from './repositories/drizzle-repositories';