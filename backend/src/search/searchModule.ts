import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SearchController } from './searchController';
import { SearchService } from './searchService';
import { SearchRepository } from './searchRepository';
import { LlmApiService } from './llmApiService';
import { SearchMetricsService } from './searchMetricsService';

@Module({
  imports: [HttpModule],
  controllers: [SearchController],
  providers: [SearchService, SearchRepository, LlmApiService, SearchMetricsService],
  exports: [SearchMetricsService],
})
export class SearchModule {}
