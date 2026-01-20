import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import {
  AuthService,
  MCE_AUTH_PROVIDER,
  MceBridgeService,
} from '@qpp/backend-shared';

import { AuthModule } from '../auth/auth.module';
import { MetadataController } from './metadata.controller';
import { MetadataService } from './metadata.service';

@Module({
  imports: [AuthModule, CacheModule.register()],
  controllers: [MetadataController],
  providers: [
    MceBridgeService,
    MetadataService,
    {
      provide: MCE_AUTH_PROVIDER,
      useExisting: AuthService,
    },
  ],
  exports: [MceBridgeService, MetadataService],
})
export class MceModule {}
