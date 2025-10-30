import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PublicCatalogModule } from '../../public/publicCatalogModule';
import { Pool } from 'pg';
import { withDbClient } from '../../lib/dbContext';

jest.setTimeout(20000);

describe('Public Catalog Integration Tests (with transactions)', () => {
  let app: INestApplication;
  let testPool: Pool;
  let client: any;
  let orgAId: number;
  let orgBId: number;

  beforeAll(async () => {
    testPool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/ong_db' });
    client = await testPool.connect();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PublicCatalogModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use((req: any, _res: any, next: any) => {
      withDbClient(client, () => next());
    });
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (client) client.release();
    if (testPool) await testPool.end();
  });

  describe('Database Tests', () => {
    beforeEach(async () => {
      await client.query('BEGIN');

      const getOrCreateCategory = async (name: string) => {
        const found = await client.query('SELECT id FROM categories WHERE name = $1 LIMIT 1', [name]);
        if (found.rowCount > 0) return found.rows[0].id;
        const ins = await client.query('INSERT INTO categories (name) VALUES ($1) RETURNING id', [name]);
        return ins.rows[0].id;
      };
      const docesId = await getOrCreateCategory('Doces');
      const salgadosId = await getOrCreateCategory('Salgados');

      const orgA = await client.query(
        'INSERT INTO organizations (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
        ['ONG A', `onga+${Date.now()}@example.com`, 'hashed_password']
      );
      orgAId = orgA.rows[0].id;
      const orgB = await client.query(
        'INSERT INTO organizations (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
        ['ONG B', `ongb+${Date.now()}@example.com`, 'hashed_password']
      );
      orgBId = orgB.rows[0].id;

      // 5 products total
      await client.query(
        `INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['Chocolate', 'Chocolate ao leite', 10.50, docesId, 'http://example.com/chocolate.jpg', 100, 250, orgAId]
      );
      await client.query(
        `INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['Bala', 'Bala de goma', 5.00, docesId, 'http://example.com/bala.jpg', 200, 100, orgAId]
      );
      await client.query(
        `INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['Coxinha', 'Coxinha de frango', 8.00, salgadosId, 'http://example.com/coxinha.jpg', 50, 150, orgBId]
      );
      await client.query(
        `INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['Pastel', 'Pastel de carne', 12.00, salgadosId, 'http://example.com/pastel.jpg', 30, 200, orgBId]
      );
      await client.query(
        `INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['Brownie', 'Brownie de chocolate', 15.00, docesId, 'http://example.com/brownie.jpg', 40, 180, orgBId]
      );
    });

    afterEach(async () => {
      await client.query('ROLLBACK');
    });

    it('should return all products from all organizations', async () => {
      const res = await request(app.getHttpServer()).get('/api/public/catalog');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products).toHaveLength(5);
      expect(res.body.data.total).toBe(5);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(20);

      const orgIds = res.body.data.products.map((p: any) => p.organization_id);
      expect(orgIds).toContain(orgAId);
      expect(orgIds).toContain(orgBId);
    });

    it('should filter products by category', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/public/catalog?category=Doces')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.products).toHaveLength(3);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.products.every((p: any) => p.category === 'Doces')).toBe(true);
    });

    it('should filter products by price range', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/public/catalog?price_min=5&price_max=10')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.products).toHaveLength(2);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.products.every((p: any) => parseFloat(p.price) >= 5 && parseFloat(p.price) <= 10)).toBe(true);
    });

    it('should filter products by category and price range', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/public/catalog?category=Doces&price_min=5&price_max=15')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.products).toHaveLength(3);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.products.every((p: any) => p.category === 'Doces' && parseFloat(p.price) >= 5 && parseFloat(p.price) <= 15)).toBe(true);
    });

    it('should apply pagination correctly', async () => {
      const res1 = await request(app.getHttpServer()).get('/api/public/catalog?page=1&limit=2').expect(200);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.products).toHaveLength(2);
      expect(res1.body.data.total).toBe(5);
      expect(res1.body.data.page).toBe(1);
      expect(res1.body.data.limit).toBe(2);

      const res2 = await request(app.getHttpServer()).get('/api/public/catalog?page=2&limit=2').expect(200);
      expect(res2.body.success).toBe(true);
      expect(res2.body.data.products).toHaveLength(2);
      expect(res2.body.data.total).toBe(5);
      expect(res2.body.data.page).toBe(2);
      expect(res2.body.body?.limit ?? res2.body.data.limit).toBe(2);

      const ids1 = res1.body.data.products.map((p: any) => p.id);
      const ids2 = res2.body.data.products.map((p: any) => p.id);
      expect(ids1).not.toEqual(ids2);
    });

    it('should return empty array when no products match filters', async () => {
      const res = await request(app.getHttpServer()).get('/api/public/catalog?category=Inexistente').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products).toHaveLength(0);
      expect(res.body.data.total).toBe(0);
    });

    it('should use default pagination values', async () => {
      const res = await request(app.getHttpServer()).get('/api/public/catalog').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(20);
    });
  });
});