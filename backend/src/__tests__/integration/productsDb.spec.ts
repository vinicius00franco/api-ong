import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ProductModule } from '../../products/productModule';
import { ProductRepository } from '../../products/productRepository';
import { CategoryRepository } from '../../categories/categoryRepository';
import { AuthGuard } from '../../middleware/authMiddleware';
import { Pool } from 'pg';

// Run these only when a real DB URL is available
const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;
jest.setTimeout(20000);

describeIfDb('Products integration (real DB) with transactions', () => {
  let app: INestApplication;
  let pool: Pool;
  let client: any;

  // Minimal transactional product repository that uses the provided client
  class TxProductRepository {
    constructor(private client: any) {}

    async create(product: any) {
      const query = `
      INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
      const values = [
        product.name,
        product.description,
        product.price,
        product.category_id,
        product.image_url,
        product.stock_qty,
        product.weight_grams,
        product.organization_id,
      ];
      const result = await this.client.query(query, values);
      return result.rows[0];
    }

    // other methods can be added if needed by the module
  }

  // Minimal transactional category repository that uses the provided client
  class TxCategoryRepository {
    constructor(private client: any) {}

    async exists(id: number) {
      const res = await this.client.query('SELECT 1 FROM categories WHERE id = $1', [id]);
      return (res.rowCount ?? 0) > 0;
    }
  }

  beforeAll(async () => {
    // quick connectivity check; if fails, skip
    try {
      pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/ong_db' });
      await pool.query('SELECT 1');
    } catch (e) {
      // no DB available, skip suite
      // eslint-disable-next-line jest/no-focused-tests
      test.skip('DB not available');
      return;
    }

    // create a client dedicated for tests (we will BEGIN/ROLLBACK per test)
    client = await pool.connect();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ProductModule],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          // Use seeded org id 1
          req.organizationId = 1;
          return true;
        },
      })
  // provide DB client and override repositories to use the same transactional client
  .overrideProvider('DB')
  .useValue(client)
  .overrideProvider(ProductRepository)
  .useValue(new TxProductRepository(client))
  .overrideProvider(CategoryRepository)
  .useValue(new TxCategoryRepository(client))
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (client) client.release();
    if (pool) await pool.end();
    if (app) await app.close();
  });

  beforeEach(async () => {
    // start a transaction and prepare minimal data
    await client.query('BEGIN');

    // ensure categories exist for the valid-case
    await client.query('DELETE FROM products');
    await client.query('DELETE FROM categories');
    await client.query('INSERT INTO categories (id, name) VALUES ($1, $2)', [1, 'Doces']);
    // ensure organization id 1 exists for auth-mocked org
    await client.query('INSERT INTO organizations (id, name, email, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING', [1, 'ONG Seed', `seed+${Date.now()}@example.com`, 'hashed_password']);
  });

  afterEach(async () => {
    // rollback all changes
    await client.query('ROLLBACK');
  });

  it('should create a product with valid category_id', async () => {
    const createDto = {
      name: 'DB Test Product',
      description: 'Desc',
      price: 9.99,
      category_id: 1,
      image_url: 'http://example.com/image.jpg',
      stock_qty: 10,
      weight_grams: 200,
    };

    const res = await request(app.getHttpServer())
      .post('/products')
      .send(createDto)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.category_id).toBe(1);
    expect(res.body.data.organization_id).toBe(1);
  });

  it('should reject product with invalid category_id', async () => {
    const createDto = {
      name: 'Invalid Cat Product',
      description: 'Desc',
      price: 9.99,
      category_id: 999999,
      image_url: 'http://example.com/image.jpg',
      stock_qty: 5,
      weight_grams: 100,
    };

    const res = await request(app.getHttpServer())
      .post('/products')
      .send(createDto)
      .expect(400);

    expect(res.body.message).toContain('Invalid category_id');
  });
});
