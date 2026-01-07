import { Inject, Injectable, Logger } from '@nestjs/common';
import { createDatabaseFromClient } from '@qs-pro/database';
import { runWithDbContext, getDbFromContext } from './db-context';

@Injectable()
export class RlsContextService {
  private readonly logger = new Logger(RlsContextService.name);

  constructor(@Inject('SQL_CLIENT') private readonly sql: any) {}

  private makeDrizzleCompatibleSql(reserved: any): any {
    // postgres.js `reserve()` returns a Sql tag function without `.options`, but
    // drizzle-orm's postgres-js driver expects `client.options.parsers` to exist.
    // Copy the base client options/parameters onto the reserved Sql tag.
    if (!reserved || typeof reserved !== 'function') return reserved;

    if (!('options' in reserved)) {
      Object.defineProperty(reserved, 'options', {
        value: this.sql?.options,
        enumerable: false,
      });
    }

    if (!('parameters' in reserved)) {
      Object.defineProperty(reserved, 'parameters', {
        value: this.sql?.parameters,
        enumerable: false,
      });
    }

    return reserved;
  }

  async runWithTenantContext<T>(
    tenantId: string,
    mid: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const existing = getDbFromContext();
    if (existing) {
      return fn();
    }

    const reserved = await this.sql.reserve();
    try {
      // Postgres does not allow bind parameters in `SET ... = ...`; use set_config instead.
      await reserved`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
      await reserved`SELECT set_config('app.mid', ${mid}, false)`;

      const db = createDatabaseFromClient(
        this.makeDrizzleCompatibleSql(reserved),
      );
      return await runWithDbContext(db, fn);
    } catch (error) {
      this.logger.error(
        'Failed to run with tenant context',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    } finally {
      try {
        await reserved`RESET app.tenant_id`;
        await reserved`RESET app.mid`;
      } catch {
        // Best-effort cleanup; connection is released regardless.
      }
      await reserved.release();
    }
  }
}
