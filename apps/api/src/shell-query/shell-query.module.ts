import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ShellQueryService } from './shell-query.service';
import { ShellQueryController } from './shell-query.controller';
import { DatabaseModule } from '../database/database.module';
import { MceModule } from '../mce/mce.module';
import { DrizzleTenantRepository } from '@qs-pro/database';
import { CsrfGuard } from '../auth/csrf.guard';
import { ShellQuerySseService } from './shell-query-sse.service';
import { DrizzleShellQueryRunRepository } from './drizzle-shell-query-run.repository';
import { RlsContextService } from '../database/rls-context.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'shell-query',
    }),
    DatabaseModule,
    MceModule,
  ],
  controllers: [ShellQueryController],
  providers: [
    ShellQueryService,
    ShellQuerySseService,
    CsrfGuard,
    {
      provide: 'TENANT_REPOSITORY',
      useFactory: (db: any) => new DrizzleTenantRepository(db),
      inject: ['DATABASE'],
    },
    {
      provide: 'SHELL_QUERY_RUN_REPOSITORY',
      useFactory: (db: any, rlsContext: RlsContextService) =>
        new DrizzleShellQueryRunRepository(db, rlsContext),
      inject: ['DATABASE', RlsContextService],
    },
  ],
  exports: [ShellQueryService],
})
export class ShellQueryModule {}
