import { SearchMetricsService } from '../../search/searchMetricsService';
import { Pool } from 'pg';
import { withDbClient } from '../../lib/dbContext';

describe('Search Metrics Service', () => {
  let pool: Pool;
  let client: any;
  let service: SearchMetricsService;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/ong_db',
    });
    client = await pool.connect();
  });

  afterAll(async () => {
    if (client) client.release();
    if (pool) await pool.end();
  });

  beforeEach(async () => {
    await client.query('BEGIN');
    service = new SearchMetricsService();
  });

  afterEach(async () => {
    await client.query('ROLLBACK');
  });

  describe('trackSearch', () => {
    it('should track search with results', async () => {
      const metric = await withDbClient(client, () =>
        service.trackSearch({
          query: 'chocolate',
          aiUsed: true,
          resultsCount: 5,
          latencyMs: 150,
          userId: 'user-123',
        })
      );

      expect(metric.id).toBeDefined();
      expect(metric.query).toBe('chocolate');
      expect(metric.aiUsed).toBe(true);
      expect(metric.resultsCount).toBe(5);
    });

    it('should track zero results searches', async () => {
      const metric = await withDbClient(client, () =>
        service.trackSearch({
          query: 'xyzabc123',
          aiUsed: true,
          resultsCount: 0,
          latencyMs: 200,
        })
      );

      expect(metric.resultsCount).toBe(0);
      expect(metric.zeroResults).toBe(true);
    });

    it('should track fallback searches', async () => {
      const metric = await withDbClient(client, () =>
        service.trackSearch({
          query: 'test',
          aiUsed: false,
          fallbackApplied: true,
          resultsCount: 3,
          latencyMs: 50,
        })
      );

      expect(metric.aiUsed).toBe(false);
      expect(metric.fallbackApplied).toBe(true);
    });
  });

  describe('trackClick', () => {
    it('should track user click on search result', async () => {
      const searchMetric = await withDbClient(client, () =>
        service.trackSearch({
          query: 'chocolate',
          aiUsed: true,
          resultsCount: 5,
          latencyMs: 150,
        })
      );

      const click = await withDbClient(client, () =>
        service.trackClick({
          searchMetricId: searchMetric.id,
          productId: 123,
          position: 1,
        })
      );

      expect(click.searchMetricId).toBe(searchMetric.id);
      expect(click.productId).toBe(123);
      expect(click.position).toBe(1);
    });
  });

  describe('getZeroResultsRate', () => {
    it('should calculate zero results rate', async () => {
      await withDbClient(client, () =>
        service.trackSearch({ query: 'test1', aiUsed: true, resultsCount: 5, latencyMs: 100 })
      );
      await withDbClient(client, () =>
        service.trackSearch({ query: 'test2', aiUsed: true, resultsCount: 0, latencyMs: 100 })
      );
      await withDbClient(client, () =>
        service.trackSearch({ query: 'test3', aiUsed: true, resultsCount: 0, latencyMs: 100 })
      );

      const rate = await withDbClient(client, () =>
        service.getZeroResultsRate({ hours: 24 })
      );

      expect(rate).toBeCloseTo(66.67, 1); // 2/3 = 66.67%
    });
  });

  describe('getClickThroughRate', () => {
    it('should calculate CTR for searches', async () => {
      const search1 = await withDbClient(client, () =>
        service.trackSearch({ query: 'test1', aiUsed: true, resultsCount: 5, latencyMs: 100 })
      );
      const search2 = await withDbClient(client, () =>
        service.trackSearch({ query: 'test2', aiUsed: true, resultsCount: 5, latencyMs: 100 })
      );
      await withDbClient(client, () =>
        service.trackSearch({ query: 'test3', aiUsed: true, resultsCount: 5, latencyMs: 100 })
      );

      await withDbClient(client, () =>
        service.trackClick({ searchMetricId: search1.id, productId: 1, position: 1 })
      );
      await withDbClient(client, () =>
        service.trackClick({ searchMetricId: search2.id, productId: 2, position: 1 })
      );

      const ctr = await withDbClient(client, () =>
        service.getClickThroughRate({ hours: 24 })
      );

      expect(ctr).toBeCloseTo(66.67, 1); // 2/3 = 66.67%
    });
  });

  describe('getAverageLatency', () => {
    it('should calculate average latency', async () => {
      await withDbClient(client, () =>
        service.trackSearch({ query: 'test1', aiUsed: true, resultsCount: 5, latencyMs: 100 })
      );
      await withDbClient(client, () =>
        service.trackSearch({ query: 'test2', aiUsed: true, resultsCount: 5, latencyMs: 200 })
      );
      await withDbClient(client, () =>
        service.trackSearch({ query: 'test3', aiUsed: true, resultsCount: 5, latencyMs: 300 })
      );

      const avgLatency = await withDbClient(client, () =>
        service.getAverageLatency({ hours: 24 })
      );

      expect(avgLatency).toBe(200);
    });

    it('should calculate latency by AI vs fallback', async () => {
      await withDbClient(client, () =>
        service.trackSearch({ query: 'test1', aiUsed: true, resultsCount: 5, latencyMs: 200 })
      );
      await withDbClient(client, () =>
        service.trackSearch({ query: 'test2', aiUsed: false, resultsCount: 5, latencyMs: 50 })
      );

      const aiLatency = await withDbClient(client, () =>
        service.getAverageLatency({ hours: 24, aiUsed: true })
      );
      const fallbackLatency = await withDbClient(client, () =>
        service.getAverageLatency({ hours: 24, aiUsed: false })
      );

      expect(aiLatency).toBe(200);
      expect(fallbackLatency).toBe(50);
    });
  });

  describe('getQualityScore', () => {
    it('should calculate overall quality score', async () => {
      const search1 = await withDbClient(client, () =>
        service.trackSearch({ query: 'test1', aiUsed: true, resultsCount: 5, latencyMs: 100 })
      );
      await withDbClient(client, () =>
        service.trackSearch({ query: 'test2', aiUsed: true, resultsCount: 5, latencyMs: 100 })
      );
      await withDbClient(client, () =>
        service.trackSearch({ query: 'test3', aiUsed: true, resultsCount: 0, latencyMs: 100 })
      );

      await withDbClient(client, () =>
        service.trackClick({ searchMetricId: search1.id, productId: 1, position: 1 })
      );

      const score = await withDbClient(client, () =>
        service.getQualityScore({ hours: 24 })
      );

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
