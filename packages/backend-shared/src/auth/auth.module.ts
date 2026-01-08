import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { DatabaseModule } from '../database/database.module';
import {
  DrizzleTenantRepository,
  DrizzleUserRepository,
  DrizzleCredentialsRepository,
} from '@qs-pro/database';

@Module({
  imports: [DatabaseModule],
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
