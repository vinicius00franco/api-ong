import { Injectable, Logger } from '@nestjs/common';
import { IAIFilters, ISearchResponse } from './searchTypes';
import { SearchRepository } from './searchRepository';
import { LlmApiService } from './llmApiService';
import { SearchMetricsService } from './searchMetricsService';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly repository: SearchRepository,
    private readonly llmApi: LlmApiService,
    private readonly metrics: SearchMetricsService,
  ) {}

  async searchProducts(query: string, userId?: string): Promise<ISearchResponse> {
    const startTime = Date.now();
    const aiFilters = await this.llmApi.getFilters(query);
    const aiSuccess = !!aiFilters;

    if (!aiSuccess || this.areFiltersInsufficient(aiFilters)) {
      const fallbackApplied = true;
      this.logSearchEvent(query, aiFilters, aiSuccess, fallbackApplied);
      const products = await this.repository.findByTextFullText(query);
      const latencyMs = Date.now() - startTime;
      
      await this.metrics.trackSearch({
        query,
        aiUsed: false,
        fallbackApplied: true,
        resultsCount: products.length,
        latencyMs,
        userId,
      });
      
      return this.formatFallbackResponse(query, products);
    }

    const fallbackApplied = false;
    this.logSearchEvent(query, aiFilters, aiSuccess, fallbackApplied);

    const products = await this.repository.findByFilters(aiFilters as IAIFilters);
    const latencyMs = Date.now() - startTime;
    
    await this.metrics.trackSearch({
      query,
      aiUsed: true,
      fallbackApplied: false,
      resultsCount: products.length,
      latencyMs,
      userId,
    });
    
    return this.formatSmartResponse(query, aiFilters as IAIFilters, products);
  }

  private areFiltersInsufficient(filters: IAIFilters | null): boolean {
    if (!filters) return true;
    return !filters.category && filters.price_min === undefined && filters.price_max === undefined;
  }

  private formatFallbackResponse(query: string, products: any[]): ISearchResponse {
    return {
      interpretation: `Buscando por texto: "${query}"`,
      ai_used: false,
      fallback_applied: true,
      data: products,
    };
  }

  private formatSmartResponse(originalQuery: string, filters: IAIFilters, products: any[]): ISearchResponse {
    const parts: string[] = ['Buscando por:'];
    if (filters.search_term) parts.push(`Termo='${filters.search_term}'`);
    if (filters.category) parts.push(`Categoria='${filters.category}'`);
    if (filters.price_min !== undefined) parts.push(`Preço Mín.='${filters.price_min}'`);
    if (filters.price_max !== undefined) parts.push(`Preço Máx.='${filters.price_max}'`);
    const interpretation = parts.join(', ');

    return {
      interpretation,
      ai_used: true,
      fallback_applied: false,
      data: products,
    };
  }

  private logSearchEvent(
    query: string,
    filters: IAIFilters | null,
    aiSuccess: boolean,
    fallbackApplied: boolean,
  ) {
    this.logger.log(
      JSON.stringify({
        message: 'SmartSearch Event',
        input_text: query,
        generated_filters: filters || {},
        ai_success: aiSuccess,
        fallback_applied: fallbackApplied,
      }),
    );
  }
}
