import { Module } from '@nestjs/common';
import {
  DrizzleFeatureOverrideRepository,
  DrizzleTenantRepository,
} from '@qs-pro/database';

import { DatabaseModule } from '../database/database.module';
import { FeaturesController } from './features.controller';
import { FeaturesService } from './features.service';
import { SeatLimitService } from './seat-limit.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FeaturesController],
  providers: [
    FeaturesService,
    SeatLimitService,
    {
      provide: 'FEATURE_OVERRIDE_REPOSITORY',
      useFactory: (db: any) => new DrizzleFeatureOverrideRepository(db),
      inject: ['DATABASE'],
    },
    {
      provide: 'TENANT_REPOSITORY',
      useFactory: (db: any) => new DrizzleTenantRepository(db),
      inject: ['DATABASE'],
    },
  ],
  exports: [FeaturesService, SeatLimitService],
})
export class FeaturesModule {}
