import { Controller, Get, Query } from '@nestjs/common';
import { PublicCatalogService } from './publicCatalogService';
import { ApiResponse } from '../lib/apiResponse';
import { HandleErrors } from '../lib/handleErrors';
import { publicCatalogQuerySchema, PublicCatalogQueryDto } from './publicCatalogSchemas';
import { ZodValidationPipe } from '../lib/zodValidationPipe';

@Controller('api/public/catalog')
export class PublicCatalogController {
  constructor(private readonly service: PublicCatalogService) {}

  @Get()
  @HandleErrors()
  async getCatalog(
    @Query(new ZodValidationPipe(publicCatalogQuerySchema)) query: PublicCatalogQueryDto,
  ) {
    const result = await this.service.getPublicCatalog(query);
    return ApiResponse.success(result);
  }
}
