// Set environment variables globally before any imports
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/ong_db';
process.env.LLM_API_URL = 'http://localhost:8000/api/v1/parse-query-only';
process.env.LLM_TIMEOUT = '3000';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { Pool } from 'pg';
import { withDbClient } from '../../lib/dbContext';
import { LlmApiService } from '../../search/llmApiService';
import { HttpExceptionFilter } from '../../lib/httpExceptionFilter';
import * as bcrypt from 'bcrypt';

jest.setTimeout(30000);

describe('Full Flow Integration Tests', () => {
  let app: INestApplication;
  let testPool: Pool;
  let client: any;
  let llmService: LlmApiService;
  let orgId: number;
  let categoryId: number;
  let productId: number;
  let customerId: number;
  let accessToken: string;

  const OLD_ENV = process.env;

  beforeAll(async () => {
    // Set up test environment variables
    process.env = {
      ...OLD_ENV,
      LLM_API_URL: 'http://llm-test/api',
      LLM_TIMEOUT: '3000',
      JWT_SECRET: 'test_jwt_secret_full_flow',
      DATABASE_URL: 'postgresql://user:password@localhost:5432/ong_db'
    };

    testPool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    client = await testPool.connect();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new HttpExceptionFilter());
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

describe('Complete User Journey', () => {
  beforeAll(async () => {
    // Clean up and setup test data
    await client.query('TRUNCATE TABLE orders, products, categories, organizations, customers RESTART IDENTITY CASCADE');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    const orgResult = await client.query(
      'INSERT INTO organizations (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      ['ONG Test Flow', 'flow@test.com', hashedPassword]
    );
    orgId = orgResult.rows[0].id;

    const categoryResult = await client.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING id',
      ['Doces']
    );
    categoryId = categoryResult.rows[0].id;

    // Create a customer for orders
    const customerResult = await client.query(
      'INSERT INTO customers (name, email) VALUES ($1, $2) RETURNING id',
      ['João Silva', 'joao@test.com']
    );
    customerId = customerResult.rows[0].id;
  });

  it('should complete full authentication and product management flow', async () => {
      // Step 1: Health check
      const healthRes = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);
      expect(healthRes.body).toEqual({ status: 'ok' });

            // Step 2: Login and get token
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'flow@test.com',
          password: 'password123'
        })
        .expect(201);

      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data).toHaveProperty('access_token');
      expect(loginRes.body.data).toHaveProperty('organization_id');
      accessToken = loginRes.body.data.access_token;

      // Step 3: Create product with authentication
      const createProductRes = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Brigadeiro Gourmet',
          description: 'Brigadeiro artesanal com chocolate belga',
          price: 8.50,
          category_id: categoryId,
          image_url: 'https://example.com/brigadeiro.jpg',
          stock_qty: 100,
          weight_grams: 50
        })
        .expect(201);

      expect(createProductRes.body.success).toBe(true);
      expect(createProductRes.body.data).toHaveProperty('id');
      expect(createProductRes.body.data.name).toBe('Brigadeiro Gourmet');
      expect(createProductRes.body.data.organization_id).toBe(orgId);
      productId = createProductRes.body.data.id;

      // Step 4: Get all products for organization
      const getProductsRes = await request(app.getHttpServer())
        .get('/api/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getProductsRes.body.success).toBe(true);
      expect(Array.isArray(getProductsRes.body.data)).toBe(true);
      expect(getProductsRes.body.data.length).toBeGreaterThan(0);
      expect(getProductsRes.body.data[0].organization_id).toBe(orgId);

      // Step 5: Get specific product
      const getProductRes = await request(app.getHttpServer())
        .get(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getProductRes.body.success).toBe(true);
      expect(getProductRes.body.data.id).toBe(productId);
      expect(getProductRes.body.data.name).toBe('Brigadeiro Gourmet');

      // Step 6: Update product
      const updateProductRes = await request(app.getHttpServer())
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Brigadeiro Gourmet Premium',
          price: 10.00,
          stock_qty: 80
        })
        .expect(200);

      expect(updateProductRes.body.success).toBe(true);
      expect(updateProductRes.body.data.name).toBe('Brigadeiro Gourmet Premium');
      expect(updateProductRes.body.data.price).toBe("10.00");

      // Step 7: Create order
      const createOrderRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          customer_id: customerId,
          items: [
            { product_id: productId, quantity: 2 }
          ]
        })
        .expect(201);

      expect(createOrderRes.body.success).toBe(true);
      expect(createOrderRes.body.data).toHaveProperty('id');
      expect(createOrderRes.body.data).toHaveProperty('total');
      const orderId = createOrderRes.body.data.id;

      // Step 8: Get orders for organization
      const getOrdersRes = await request(app.getHttpServer())
        .get('/api/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getOrdersRes.body.success).toBe(true);
      expect(Array.isArray(getOrdersRes.body.data)).toBe(true);
      expect(getOrdersRes.body.data.length).toBeGreaterThan(0);

      // Step 9: Get specific order
      const getOrderRes = await request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getOrderRes.body.success).toBe(true);
      expect(getOrderRes.body.data.id).toBe(orderId);
    });

    it('should complete public catalog and search flow', async () => {
      // Create additional products for search testing
      await client.query(
        'INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        ['Bolo de Chocolate', 'Bolo caseiro delicioso', 25.00, categoryId, 'https://example.com/bolo.jpg', 10, 1000, orgId]
      );
      await client.query(
        'INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        ['Torta de Morango', 'Torta fresca com morangos', 35.00, categoryId, 'https://example.com/torta.jpg', 5, 1500, orgId]
      );

      // Step 1: Get public catalog
      const catalogRes = await request(app.getHttpServer())
        .get('/api/public/catalog')
        .expect(200);

      expect(catalogRes.body.success).toBe(true);
      expect(catalogRes.body.data).toHaveProperty('products');
      expect(catalogRes.body.data).toHaveProperty('total');
      expect(Array.isArray(catalogRes.body.data.products)).toBe(true);
      expect(catalogRes.body.data.total).toBeGreaterThan(0);

      // Step 2: Search with AI-powered query
      jest.spyOn(llmService, 'getFilters').mockResolvedValue({
        category: 'Doces',
        price_max: 30
      });

      const searchRes = await request(app.getHttpServer())
        .get('/api/public/search?q=doces até 30 reais')
        .expect(200);

      expect(searchRes.body.success).toBe(true);
      expect(searchRes.body.data).toHaveProperty('interpretation');
      expect(searchRes.body.data).toHaveProperty('ai_used');
      expect(searchRes.body.data).toHaveProperty('fallback_applied');
      expect(searchRes.body.data).toHaveProperty('data');
      expect(searchRes.body.data.ai_used).toBe(true);
      expect(searchRes.body.data.fallback_applied).toBe(false);
      expect(Array.isArray(searchRes.body.data.data)).toBe(true);

      // Step 3: Search with fallback (LLM fails)
      jest.spyOn(llmService, 'getFilters').mockResolvedValue(null);

      const fallbackSearchRes = await request(app.getHttpServer())
        .get('/api/public/search?q=chocolate')
        .expect(200);

      expect(fallbackSearchRes.body.success).toBe(true);
      expect(fallbackSearchRes.body.data.ai_used).toBe(false);
      expect(fallbackSearchRes.body.data.fallback_applied).toBe(true);
      expect(fallbackSearchRes.body.data.interpretation).toContain('chocolate');
      expect(Array.isArray(fallbackSearchRes.body.data.data)).toBe(true);
    });

    it('should handle authentication failures properly', async () => {
      // Try to access protected route without token
      const noTokenRes = await request(app.getHttpServer())
        .get('/api/products')
        .expect(401);

      expect(noTokenRes.body.success).toBe(false);
      expect(noTokenRes.body.message).toBeDefined();

      // Try to access protected route with invalid token
      const invalidTokenRes = await request(app.getHttpServer())
        .get('/api/products')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(invalidTokenRes.body.success).toBe(false);
      expect(invalidTokenRes.body.message).toBeDefined();
    });

    it('should validate input data properly', async () => {
      // Login first to get token
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'flow@test.com',
          password: 'password123'
        })
        .expect(201);

      accessToken = loginRes.body.data.access_token;

      // Try to create product with invalid data
      const invalidProductRes = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: '', // Invalid: empty name
          price: -10, // Invalid: negative price
          category_id: categoryId
        })
        .expect(400);

      expect(invalidProductRes.body.success).toBe(false);
      expect(invalidProductRes.body.message).toBeDefined();

      // Try to create order with invalid data
      const invalidOrderRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          items: [] // Invalid: empty items array
        })
        .expect(400);

      expect(invalidOrderRes.body.success).toBe(false);
      expect(invalidOrderRes.body.message).toBeDefined();
    });

    it('should enforce multi-tenancy isolation', async () => {
      // Create another organization
      const otherHashedPassword = await bcrypt.hash('otherpass', 10);
      const otherOrgResult = await client.query(
        'INSERT INTO organizations (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
        ['Other ONG', 'other@test.com', otherHashedPassword]
      );
      const otherOrgId = otherOrgResult.rows[0].id;

      // Create product for other organization
      const otherProductResult = await client.query(
        'INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
        ['Other Product', 'Product from other org', 15.00, categoryId, 'https://example.com/other.jpg', 20, 200, otherOrgId]
      );

      // Login as first organization
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'flow@test.com',
          password: 'password123'
        })
        .expect(201);

      accessToken = loginRes.body.data.access_token;

      // Get products - should only see products from own organization
      const productsRes = await request(app.getHttpServer())
        .get('/api/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(productsRes.body.success).toBe(true);
      // Should not see the product from other organization
      const productIds = productsRes.body.data.map((p: any) => p.id);
      expect(productIds).not.toContain(otherProductResult.rows[0].id);

      // Try to access product from other organization - should fail
      const otherProductRes = await request(app.getHttpServer())
        .get(`/api/products/${otherProductResult.rows[0].id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(otherProductRes.body.success).toBe(false);
    });
  });
});