import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ProductModule } from '../../products/productModule';
import { AuthGuard } from '../../middleware/authMiddleware';
import { pool } from '../../lib/database';

// Run these only when a real DB URL is available
const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('Products integration (real DB)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // quick connectivity check; if fails, skip
    try {
      await pool.query('SELECT 1');
    } catch (e) {
      // no DB available, skip suite
      // eslint-disable-next-line jest/no-focused-tests
      test.skip('DB not available');
      return;
    }

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
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
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

    expect(res.body).toHaveProperty('id');
    expect(res.body.category_id).toBe(1);
    expect(res.body.organization_id).toBe(1);
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
