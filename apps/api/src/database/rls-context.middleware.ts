import { Inject, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { createDatabaseFromClient } from '@qs-pro/database';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Sql } from 'postgres';

import { getDbFromContext, runWithDbContext } from './db-context';

type SecureSession = {
  get(key: string): unknown;
};

@Injectable()
export class RlsContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RlsContextMiddleware.name);

  constructor(@Inject('SQL_CLIENT') private readonly sql: Sql) {}

  private makeDrizzleCompatibleSql(reserved: Sql): Sql {
    const reservedWithMeta = reserved as Sql & {
      options: Sql['options'];
      parameters: Sql['parameters'];
    };

    if (!('options' in reservedWithMeta)) {
      Object.defineProperty(reservedWithMeta, 'options', {
        value: this.sql.options,
        enumerable: false,
      });
    }

    if (!('parameters' in reservedWithMeta)) {
      Object.defineProperty(reservedWithMeta, 'parameters', {
        value: this.sql.parameters,
        enumerable: false,
      });
    }

    return reservedWithMeta;
  }

  use(
    req: FastifyRequest & { session?: SecureSession },
    res: FastifyReply,
    next: () => void,
  ) {
    if (getDbFromContext()) {
      next();
      return;
    }

    const tenantId = req.session?.get('tenantId');
    const mid = req.session?.get('mid');

    if (typeof tenantId !== 'string' || typeof mid !== 'string') {
      next();
      return;
    }

    void this.attachContext(res, tenantId, mid, next);
  }

  private async attachContext(
    res: FastifyReply,
    tenantId: string,
    mid: string,
    next: () => void,
  ) {
    const reserved = await this.sql.reserve();
    try {
      // Postgres does not allow bind parameters in `SET ... = ...`; use set_config instead.
      await reserved`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
      await reserved`SELECT set_config('app.mid', ${mid}, false)`;
    } catch (error) {
      reserved.release();
      throw error;
    }

    let released = false;
    const cleanup = async () => {
      if (released) {
        return;
      }
      released = true;
      try {
        await reserved`RESET app.tenant_id`;
        await reserved`RESET app.mid`;
        await reserved`RESET app.user_id`;
      } catch (err) {
        this.logger.warn('Failed to reset RLS context variables', err);
      }
      reserved.release();
    };

    res.raw.once('finish', () => void cleanup());
    res.raw.once('close', () => void cleanup());
    res.raw.once('error', () => void cleanup());

    const db = createDatabaseFromClient(
      this.makeDrizzleCompatibleSql(reserved),
    );
    runWithDbContext(db, next, reserved);
  }
}
