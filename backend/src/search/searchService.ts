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
      
      this.logger.log(JSON.stringify({ message: 'Starting fallback search', query }));
      let products = await this.repository.findByTextFullText(query);
      this.logger.log(JSON.stringify({ message: 'Full-text search result', count: products.length }));

      if (!products || products.length === 0) {
        this.logger.log(JSON.stringify({ message: 'Trying ILIKE fallback', query }));
        products = await this.repository.findByText(query);
        this.logger.log(JSON.stringify({ message: 'ILIKE search result', count: products.length }));

        if (!products || products.length === 0) {
          const tokens = (query || '').toLowerCase().match(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g) || [];
          this.logger.log(JSON.stringify({ message: 'Tokenized fallback', tokens }));
          const aggregated: Record<number, any> = {};
          for (const t of tokens) {
            if (t.length < 3) continue;
            const partial = await this.repository.findByText(t);
            this.logger.log(JSON.stringify({ message: 'Token search', token: t, found: partial.length }));
            for (const p of partial) {
              aggregated[p.id] = p;
            }
            if (Object.keys(aggregated).length > 0) break;
          }
          products = Object.values(aggregated);
          this.logger.log(JSON.stringify({ message: 'Final aggregated', count: products.length }));
        }
      }

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

    let fallbackApplied = false;
    this.logSearchEvent(query, aiFilters, aiSuccess, fallbackApplied);

    this.logger.log(
      JSON.stringify({ message: 'AI filters applied. Querying DB with filters', filters: aiFilters }),
    );
    let products = await this.repository.findByFilters(aiFilters as IAIFilters);

    // If AI-based filter search returned zero results, try a graceful fallback using the text term
    if ((!products || products.length === 0) && (aiFilters as IAIFilters).search_term) {
      const term = (aiFilters as IAIFilters).search_term as string;
      this.logger.log(
        JSON.stringify({ message: 'AI returned zero results. Applying text fallbacks with term', term }),
      );
      fallbackApplied = true;

      let fbResults = await this.repository.findByTextFullText(term);
      this.logger.log(
        JSON.stringify({ message: 'AI->Full-text fallback result', term, count: fbResults.length }),
      );
      if (!fbResults || fbResults.length === 0) {
        fbResults = await this.repository.findByText(term);
        this.logger.log(
          JSON.stringify({ message: 'AI->ILIKE fallback result', term, count: fbResults.length }),
        );
      }
      if (fbResults && fbResults.length > 0) {
        products = fbResults;
      }
    }

    const latencyMs = Date.now() - startTime;
    await this.metrics.trackSearch({
      query,
      aiUsed: true,
      fallbackApplied,
      resultsCount: products.length,
      latencyMs,
      userId,
    });

    return this.formatSmartResponse(query, aiFilters as IAIFilters, products, fallbackApplied);
  }

  private areFiltersInsufficient(filters: IAIFilters | null): boolean {
    if (!filters) return true;
    return !filters.search_term && !filters.category && filters.price_min === undefined && filters.price_max === undefined;
  }

  private formatFallbackResponse(query: string, products: any[]): ISearchResponse {
    return {
      interpretation: `Buscando por texto: "${query}"`,
      ai_used: false,
      fallback_applied: true,
      data: products,
    };
  }

  private formatSmartResponse(
    originalQuery: string,
    filters: IAIFilters,
    products: any[],
    fallbackApplied = false,
  ): ISearchResponse {
    const parts: string[] = ['Buscando por:'];
    if (filters.search_term) parts.push(`Termo='${filters.search_term}'`);
    if (filters.category) parts.push(`Categoria='${filters.category}'`);
    if (filters.price_min !== undefined) parts.push(`Preço Mín.='${filters.price_min}'`);
    if (filters.price_max !== undefined) parts.push(`Preço Máx.='${filters.price_max}'`);
    const interpretation = parts.join(', ');

    return {
      interpretation,
      ai_used: true,
      fallback_applied: fallbackApplied,
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
