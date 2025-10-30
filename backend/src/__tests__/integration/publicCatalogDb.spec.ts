import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PublicCatalogModule } from '../../public/publicCatalogModule';
import { PublicCatalogRepository } from '../../public/publicCatalogRepository';
import { Pool } from 'pg';

describe('Public Catalog Integration Tests (with transactions)', () => {
  let app: INestApplication;
  let testPool: Pool;
  let client: any;

  beforeAll(async () => {
    // Create a single client connection and inject it into the repository
    testPool = new Pool({ connectionString: 'postgresql://user:password@localhost:5432/ong_db' });
    client = await testPool.connect();

    console.log('Setting up NestJS test module...');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PublicCatalogModule],
    })
      .overrideProvider('IPublicCatalogRepository')
      .useValue(new PublicCatalogRepository(client as any))
      .compile();

    app = moduleFixture.createNestApplication();
    console.log('Initializing NestJS app...');
    await app.init();
    console.log('NestJS app initialized successfully');

  });

  afterAll(async () => {
    if (client) {
      client.release();
    }
    if (testPool) {
      await testPool.end();
    }
    if (app) {
      await app.close();
    }
  });

  describe('Database Tests', () => {
    beforeEach(async () => {
      // Inicia transação para cada teste
      await client.query('BEGIN');

      // Limpa dados existentes
      await client.query('DELETE FROM products');
      await client.query('DELETE FROM organizations');
      await client.query('DELETE FROM categories');

      // Insere categorias
      await client.query(
        'INSERT INTO categories (id, name) VALUES ($1, $2)',
        [1, 'Doces']
      );
      await client.query(
        'INSERT INTO categories (id, name) VALUES ($1, $2)',
        [2, 'Salgados']
      );

      // Insere organizações
      await client.query(
        'INSERT INTO organizations (id, name, email, password_hash) VALUES ($1, $2, $3, $4)',
        [1, 'ONG A', 'onga@example.com', 'hashed_password']
      );
      await client.query(
        'INSERT INTO organizations (id, name, email, password_hash) VALUES ($1, $2, $3, $4)',
        [2, 'ONG B', 'ongb@example.com', 'hashed_password']
      );

      // Insere produtos para ONG A
      await client.query(
        `INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['Chocolate', 'Chocolate ao leite', 10.50, 1, 'http://example.com/chocolate.jpg', 100, 250, 1]
      );
      await client.query(
        `INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['Bala', 'Bala de goma', 5.00, 1, 'http://example.com/bala.jpg', 200, 100, 1]
      );

      // Insere produtos para ONG B
      await client.query(
        `INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['Coxinha', 'Coxinha de frango', 8.00, 2, 'http://example.com/coxinha.jpg', 50, 150, 2]
      );
      await client.query(
        `INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['Pastel', 'Pastel de carne', 12.00, 2, 'http://example.com/pastel.jpg', 30, 200, 2]
      );
      await client.query(
        `INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['Brownie', 'Brownie de chocolate', 15.00, 1, 'http://example.com/brownie.jpg', 40, 180, 2]
      );
    });

    afterEach(async () => {
      // Rollback da transação - desfaz todas as mudanças
      await client.query('ROLLBACK');
    });

    it('should return all products from all organizations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/public/catalog');

      if (res.status !== 200) {
        console.error('Response status:', res.status);
        console.error('Response body:', res.body);
        console.error('Response text:', res.text);
      }

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products).toHaveLength(5);
      expect(res.body.data.total).toBe(5);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(20);

      // Verifica que produtos de ambas as ONGs estão presentes
      const orgIds = res.body.data.products.map((p: any) => p.organization_id);
      expect(orgIds).toContain(1);
      expect(orgIds).toContain(2);
    });

    it('should filter products by category', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/public/catalog?category=Doces')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.products).toHaveLength(3); // Chocolate, Bala, Brownie
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.products.every((p: any) => p.category === 'Doces')).toBe(true);
    });

    it('should filter products by price range', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/public/catalog?price_min=5&price_max=10')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.products).toHaveLength(2); // Bala (5), Coxinha (8)
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.products.every((p: any) =>
        parseFloat(p.price) >= 5 && parseFloat(p.price) <= 10
      )).toBe(true);
    });

    it('should filter products by category and price range', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/public/catalog?category=Doces&price_min=5&price_max=15')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.products).toHaveLength(3); // Bala (5), Chocolate (10.5), Brownie (15)
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.products.every((p: any) =>
        p.category === 'Doces' &&
        parseFloat(p.price) >= 5 &&
        parseFloat(p.price) <= 15
      )).toBe(true);
    });

    it('should apply pagination correctly', async () => {
      // Página 1 com limite 2
      const res1 = await request(app.getHttpServer())
        .get('/api/public/catalog?page=1&limit=2')
        .expect(200);

      expect(res1.body.success).toBe(true);
      expect(res1.body.data.products).toHaveLength(2);
      expect(res1.body.data.total).toBe(5);
      expect(res1.body.data.page).toBe(1);
      expect(res1.body.data.limit).toBe(2);

      // Página 2 com limite 2
      const res2 = await request(app.getHttpServer())
        .get('/api/public/catalog?page=2&limit=2')
        .expect(200);

      expect(res2.body.success).toBe(true);
      expect(res2.body.data.products).toHaveLength(2);
      expect(res2.body.data.total).toBe(5);
      expect(res2.body.data.page).toBe(2);
      expect(res2.body.data.limit).toBe(2);

      // IDs devem ser diferentes (paginação funcionando)
      const ids1 = res1.body.data.products.map((p: any) => p.id);
      const ids2 = res2.body.data.products.map((p: any) => p.id);
      expect(ids1).not.toEqual(ids2);
    });

    it('should return empty array when no products match filters', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/public/catalog?category=Inexistente')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.products).toHaveLength(0);
      expect(res.body.data.total).toBe(0);
    });

    it('should use default pagination values', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/public/catalog')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(20);
    });
  });
});