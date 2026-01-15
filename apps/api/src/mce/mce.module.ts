import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MceBridgeService } from './mce-bridge.service';
import { MetadataController } from './metadata.controller';
import { MetadataService } from './metadata.service';

@Module({
  imports: [AuthModule, CacheModule.register()],
  controllers: [MetadataController],
  providers: [MceBridgeService, MetadataService],
  exports: [MceBridgeService, MetadataService],
})
export class MceModule {}
