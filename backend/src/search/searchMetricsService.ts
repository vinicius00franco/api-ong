import { Injectable, Logger } from '@nestjs/common';
import { getDb } from '../lib/dbContext';

export interface TrackSearchDto {
  query: string;
  aiUsed: boolean;
  fallbackApplied?: boolean;
  resultsCount: number;
  latencyMs: number;
  userId?: string;
}

export interface TrackClickDto {
  searchMetricId: string;
  productId: number;
  position: number;
}

export interface SearchMetric {
  id: string;
  query: string;
  aiUsed: boolean;
  fallbackApplied: boolean;
  resultsCount: number;
  zeroResults: boolean;
  latencyMs: number;
  userId?: string;
  createdAt: Date;
}

export interface ClickMetric {
  id: string;
  searchMetricId: string;
  productId: number;
  position: number;
  createdAt: Date;
}

@Injectable()
export class SearchMetricsService {
  private readonly logger = new Logger(SearchMetricsService.name);

  async trackSearch(data: TrackSearchDto): Promise<SearchMetric> {
    const query = `
      INSERT INTO search_metrics 
        (query, ai_used, fallback_applied, results_count, zero_results, latency_ms, user_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id, query, ai_used as "aiUsed", fallback_applied as "fallbackApplied", 
                results_count as "resultsCount", zero_results as "zeroResults", 
                latency_ms as "latencyMs", user_id as "userId", created_at as "createdAt"
    `;

    const zeroResults = data.resultsCount === 0;
    const result = await getDb().query(query, [
      data.query,
      data.aiUsed,
      data.fallbackApplied || false,
      data.resultsCount,
      zeroResults,
      data.latencyMs,
      data.userId || null,
    ]);

    this.logger.log(
      JSON.stringify({
        event: 'search_tracked',
        query: data.query,
        aiUsed: data.aiUsed,
        resultsCount: data.resultsCount,
        zeroResults,
      })
    );

    return result.rows[0];
  }

  async trackClick(data: TrackClickDto): Promise<ClickMetric> {
    const query = `
      INSERT INTO search_clicks 
        (search_metric_id, product_id, position, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id, search_metric_id as "searchMetricId", product_id as "productId", 
                position, created_at as "createdAt"
    `;

    const result = await getDb().query(query, [
      data.searchMetricId,
      data.productId,
      data.position,
    ]);

    this.logger.log(
      JSON.stringify({
        event: 'click_tracked',
        searchMetricId: data.searchMetricId,
        productId: data.productId,
        position: data.position,
      })
    );

    return result.rows[0];
  }

  async getZeroResultsRate(options: { hours: number }): Promise<number> {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE zero_results = true) as zero_count,
        COUNT(*) as total_count
      FROM search_metrics
      WHERE created_at > NOW() - INTERVAL '${options.hours} hours'
    `;

    const result = await getDb().query(query);
    const { zero_count, total_count } = result.rows[0];

    if (total_count === 0) return 0;
    return (parseFloat(zero_count) / parseFloat(total_count)) * 100;
  }

  async getClickThroughRate(options: { hours: number }): Promise<number> {
    const query = `
      SELECT 
        COUNT(DISTINCT sm.id) FILTER (WHERE sc.id IS NOT NULL) as searches_with_clicks,
        COUNT(DISTINCT sm.id) as total_searches
      FROM search_metrics sm
      LEFT JOIN search_clicks sc ON sm.id = sc.search_metric_id
      WHERE sm.created_at > NOW() - INTERVAL '${options.hours} hours'
    `;

    const result = await getDb().query(query);
    const { searches_with_clicks, total_searches } = result.rows[0];

    if (total_searches === 0) return 0;
    return (parseFloat(searches_with_clicks) / parseFloat(total_searches)) * 100;
  }

  async getAverageLatency(options: { hours: number; aiUsed?: boolean }): Promise<number> {
    let query = `
      SELECT AVG(latency_ms) as avg_latency
      FROM search_metrics
      WHERE created_at > NOW() - INTERVAL '${options.hours} hours'
    `;

    if (options.aiUsed !== undefined) {
      query += ` AND ai_used = ${options.aiUsed}`;
    }

    const result = await getDb().query(query);
    return parseFloat(result.rows[0].avg_latency) || 0;
  }

  async getQualityScore(options: { hours: number }): Promise<number> {
    const zeroResultsRate = await this.getZeroResultsRate(options);
    const ctr = await this.getClickThroughRate(options);

    const score = (100 - zeroResultsRate) * 0.5 + ctr * 0.5;

    this.logger.log(
      JSON.stringify({
        event: 'quality_score_calculated',
        zeroResultsRate,
        ctr,
        score,
      })
    );

    return Math.round(score * 100) / 100;
  }
}
