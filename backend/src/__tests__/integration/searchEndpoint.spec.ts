import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { SearchModule } from '../../search/searchModule';
import { LlmApiService } from '../../search/llmApiService';
import { Pool } from 'pg';
import { withDbClient } from '../../lib/dbContext';

jest.setTimeout(20000);

describe('Search Endpoint Integration Tests', () => {
  let app: INestApplication;
  let testPool: Pool;
  let client: any;
  let llmService: LlmApiService;

  const OLD_ENV = process.env;

  beforeAll(async () => {
    // Set up test environment variables
    process.env = { 
      ...OLD_ENV, 
      LLM_API_URL: 'http://llm-test/api',
      LLM_TIMEOUT: '3000' 
    };

    testPool = new Pool({ 
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/ong_db' 
    });
    client = await testPool.connect();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SearchModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use((req: any, _res: any, next: any) => {
      withDbClient(client, () => next());
    });
    await app.init();

    llmService = moduleFixture.get<LlmApiService>(LlmApiService);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (client) client.release();
    if (testPool) await testPool.end();
    // Restore original environment
    process.env = OLD_ENV;
  });

  describe('GET /api/public/search', () => {
    let orgId: number;
    let categoryId: number;

    beforeEach(async () => {
      await client.query('BEGIN');

      // Helper function to get or create organization
      const getOrCreateOrg = async (name: string) => {
        const found = await client.query('SELECT id FROM organizations WHERE name = $1 LIMIT 1', [name]);
        if (found.rowCount > 0) return found.rows[0].id;
        const ins = await client.query(
          'INSERT INTO organizations (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id', 
          [name, `${name.toLowerCase()}@test.com`, 'hash123']
        );
        return ins.rows[0].id;
      };

      // Helper function to get or create category
      const getOrCreateCategory = async (name: string) => {
        const found = await client.query('SELECT id FROM categories WHERE name = $1 LIMIT 1', [name]);
        if (found.rowCount > 0) return found.rows[0].id;
        const ins = await client.query('INSERT INTO categories (name) VALUES ($1) RETURNING id', [name]);
        return ins.rows[0].id;
      };

      // Setup test data
      orgId = await getOrCreateOrg('ONG Teste');
      categoryId = await getOrCreateCategory('Doces');

      await client.query(
        'INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        ['Brigadeiro', 'Chocolate delicioso', 5.50, categoryId, 'http://img.com/brig.jpg', 50, 30, orgId]
      );
      await client.query(
        'INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        ['Bolo de Chocolate', 'Bolo caseiro', 45.00, categoryId, 'http://img.com/bolo.jpg', 10, 800, orgId]
      );
      await client.query(
        'INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        ['Torta de Limão', 'Torta azeda', 60.00, categoryId, 'http://img.com/torta.jpg', 5, 1000, orgId]
      );
    });

    afterEach(async () => {
      await client.query('ROLLBACK');
    });

    it('should return empty results when query is empty', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/public/search')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          interpretation: 'Nenhum termo de busca fornecido.',
          ai_used: false,
          fallback_applied: false,
          data: [],
        },
      });
    });

    it('should use AI-powered search when LLM returns valid filters', async () => {
      // Mock LLM to return category + price filter
      jest.spyOn(llmService, 'getFilters').mockResolvedValue({
        category: 'Doces',
        price_max: 50,
      });

      const response = await request(app.getHttpServer())
        .get('/api/public/search?q=doces até 50 reais')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ai_used).toBe(true);
      expect(response.body.data.fallback_applied).toBe(false);
      expect(response.body.data.interpretation).toContain("Categoria='Doces'");
      expect(response.body.data.interpretation).toContain("Preço Máx.='50'");
      expect(response.body.data.data).toHaveLength(2); // Brigadeiro + Bolo (< 50)
      expect(response.body.data.data[0].name).toMatch(/Brigadeiro|Bolo/);
    });

    it('should fallback to text search when LLM returns null (timeout/error)', async () => {
      // Mock LLM to simulate timeout/failure
      jest.spyOn(llmService, 'getFilters').mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/public/search?q=chocolate')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ai_used).toBe(false);
      expect(response.body.data.fallback_applied).toBe(true);
      expect(response.body.data.interpretation).toBe('Buscando por texto: "chocolate"');
      expect(response.body.data.data.length).toBeGreaterThan(0); // ILIKE search finds products
      const names = response.body.data.data.map((p: any) => p.name);
      expect(names).toContain('Brigadeiro');
      expect(names).toContain('Bolo de Chocolate');
    });

    it('should fallback when LLM returns insufficient filters (only search_term)', async () => {
      // Mock LLM to return only search_term (insufficient)
      jest.spyOn(llmService, 'getFilters').mockResolvedValue({
        search_term: 'limão',
      });

      const response = await request(app.getHttpServer())
        .get('/api/public/search?q=limão')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ai_used).toBe(false);
      expect(response.body.data.fallback_applied).toBe(true);
      expect(response.body.data.interpretation).toBe('Buscando por texto: "limão"');
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].name).toBe('Torta de Limão');
    });

    it('should use AI search with only category filter', async () => {
      jest.spyOn(llmService, 'getFilters').mockResolvedValue({
        category: 'Doces',
      });

      const response = await request(app.getHttpServer())
        .get('/api/public/search?q=doces')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ai_used).toBe(true);
      expect(response.body.data.fallback_applied).toBe(false);
      expect(response.body.data.interpretation).toContain("Categoria='Doces'");
      expect(response.body.data.data).toHaveLength(3); // All products are in Doces category
    });

    it('should use AI search with price range filters', async () => {
      jest.spyOn(llmService, 'getFilters').mockResolvedValue({
        price_min: 44,
        price_max: 46,
      });

      const response = await request(app.getHttpServer())
        .get('/api/public/search?q=produtos entre 44 e 46 reais')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ai_used).toBe(true);
      expect(response.body.data.fallback_applied).toBe(false);
      expect(response.body.data.interpretation).toContain("Preço Mín.='44'");
      expect(response.body.data.interpretation).toContain("Preço Máx.='46'");
      expect(response.body.data.data).toHaveLength(1); // Only Bolo (45)
      expect(response.body.data.data[0].name).toBe('Bolo de Chocolate');
    });

    it('should return structured ApiResponse format', async () => {
      jest.spyOn(llmService, 'getFilters').mockResolvedValue({
        category: 'Doces',
      });

      const response = await request(app.getHttpServer())
        .get('/api/public/search?q=test')
        .expect(200);

      // Validate ApiResponse structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('interpretation');
      expect(response.body.data).toHaveProperty('ai_used');
      expect(response.body.data).toHaveProperty('fallback_applied');
      expect(response.body.data).toHaveProperty('data');
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });
  });
});
