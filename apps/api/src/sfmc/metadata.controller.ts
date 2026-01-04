import { Controller, Get, Query, UseGuards, UseFilters } from '@nestjs/common';
import { MetadataService } from './metadata.service';
import { AuthGuard } from '@nestjs/passport';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';

@Controller('metadata')
// @UseGuards(AuthGuard('jwt')) // Commented out until JWT strategy is fully implemented
@UseFilters(GlobalExceptionFilter)
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  @Get('folders')
  async getFolders(
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string,
  ) {
    return this.metadataService.getFolders(tenantId, userId);
  }

  @Get('data-extensions')
  async getDataExtensions(
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string,
    @Query('eid') eid: string,
  ) {
    return this.metadataService.getDataExtensions(tenantId, userId, eid);
  }

  @Get('fields')
  async getFields(
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string,
    @Query('key') key: string,
  ) {
    return this.metadataService.getFields(tenantId, userId, key);
  }
}
