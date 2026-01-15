import { Module } from '@nestjs/common';
import {
  DrizzleCredentialsRepository,
  DrizzleTenantRepository,
  DrizzleUserRepository,
} from '@qs-pro/database';

import { DatabaseModule } from '../database/database.module';
import { FeaturesModule } from '../features/features.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [DatabaseModule, FeaturesModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: 'TENANT_REPOSITORY',
      useFactory: (db: any) => new DrizzleTenantRepository(db),
      inject: ['DATABASE'],
    },
    {
      provide: 'USER_REPOSITORY',
      useFactory: (db: any) => new DrizzleUserRepository(db),
      inject: ['DATABASE'],
    },
    {
      provide: 'CREDENTIALS_REPOSITORY',
      useFactory: (db: any) => new DrizzleCredentialsRepository(db),
      inject: ['DATABASE'],
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
