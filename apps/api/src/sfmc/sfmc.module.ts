import { Module } from '@nestjs/common';
import { SfmcBridgeService } from './sfmc-bridge.service';
import { MetadataService } from './metadata.service';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '@nestjs/cache-manager';
import { MetadataController } from './metadata.controller';

@Module({
  imports: [AuthModule, CacheModule.register()],
  controllers: [MetadataController],
  providers: [SfmcBridgeService, MetadataService],
  exports: [SfmcBridgeService, MetadataService],
})
export class SfmcModule {}


