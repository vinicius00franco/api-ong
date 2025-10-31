import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './searchService';
import { ApiResponse } from '../lib/apiResponse';
import { HandleErrors } from '../lib/handleErrors';
import { ZodValidationPipe } from '../lib/zodValidationPipe';
import { searchQuerySchema, SearchQueryDto } from './searchSchemas';

@Controller('api/public/search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  @HandleErrors()
  async search(@Query(new ZodValidationPipe(searchQuerySchema)) query: SearchQueryDto) {
    const text = (query.q || '').trim();
    if (!text) {
      return ApiResponse.success({
        interpretation: 'Nenhum termo de busca fornecido.',
        ai_used: false,
        fallback_applied: false,
        data: [],
      });
    }
    const result = await this.service.searchProducts(text);
    return ApiResponse.success(result);
  }
}
