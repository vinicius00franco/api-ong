import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SearchController } from './searchController';
import { SearchService } from './searchService';
import { SearchRepository } from './searchRepository';
import { LlmApiService } from './llmApiService';

@Module({
  imports: [HttpModule],
  controllers: [SearchController],
  providers: [SearchService, SearchRepository, LlmApiService],
})
export class SearchModule {}
