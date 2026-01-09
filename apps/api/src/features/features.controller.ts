import { Controller, Get, UseGuards } from '@nestjs/common';
import { FeaturesService } from './features.service';
import { SessionGuard } from '../auth/session.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserSession } from '../common/decorators/current-user.decorator';
import type { TenantFeatures } from '@qs-pro/shared-types';

@Controller('features')
@UseGuards(SessionGuard)
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  /**
   * Returns the effective features for the authenticated tenant
   */
  @Get()
  async getFeatures(@CurrentUser() user: UserSession): Promise<TenantFeatures> {
    return this.featuresService.getTenantFeatures(user.tenantId);
  }
}
