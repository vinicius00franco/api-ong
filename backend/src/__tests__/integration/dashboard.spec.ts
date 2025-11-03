import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Pool } from 'pg';
import { DashboardModule } from '../../dashboard/dashboardModule';
import { AuthGuard } from '../../middleware/authMiddleware';

jest.setTimeout(20000);

describe('Dashboard integration (stats per organization)', () => {
  let app: INestApplication;
  let pool: Pool;
  let client: any;

  const guardState = { orgId: 1 };

  beforeAll(async () => {
    // Try connect to real DB, else skip
    try {
      pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/ong_db' });
      await pool.query('SELECT 1');
    } catch (e) {
      test.skip('DB not available');
      return;
    }

    client = await pool.connect();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DashboardModule],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          req.organizationId = guardState.orgId;
          return true;
        },
      })
      .overrideProvider('DB')
      .useValue(client)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    try { client?.release(); } catch {}
    try { await pool?.end(); } catch {}
    await app?.close();
  });

  beforeEach(async () => {
    await client.query('BEGIN');
    // Ensure baseline: keep categories and organizations from seed, but clean products for org
    await client.query('DELETE FROM products WHERE organization_id = $1', [guardState.orgId]);

    // Insert some products for org 1
    await client.query(
      `INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id)
       VALUES 
       ('Dash P1', 'p1', 10.00, 1, 'http://img/1.jpg', 5, 100, $1),
       ('Dash P2', 'p2', 20.00, 2, 'http://img/2.jpg', 10, 200, $1),
       ('Dash P3', 'p3', 30.00, 2, 'http://img/3.jpg', 15, 300, $1)`,
      [guardState.orgId],
    );
  });

  afterEach(async () => {
    await client.query('ROLLBACK');
  });

  it('GET /dashboard/stats should return stats filtered by organization', async () => {
    const res = await request(app.getHttpServer())
      .get('/dashboard/stats')
      .expect(200);

    expect(res.body.success).toBe(true);
    const s = res.body.data;

    // Totals
    expect(s.totalProducts).toBe(3);
    expect(s.totalOrganizations).toBe(1);
    expect(s.totalCategories).toBe(2); // categories 1 and 2 used

    // Inventory
    expect(s.totalStockQuantity).toBe(5 + 10 + 15);
    expect(Number(s.averageProductPrice.toFixed(2))).toBe(20.00);
    expect(Number(s.totalInventoryValue.toFixed(2))).toBe(10*5 + 20*10 + 30*15);

    // By category
    const byCat = s.productsByCategory.reduce((acc: any, r: any) => ({ ...acc, [r.category]: r.count }), {});
    expect(byCat['Categoria1']).toBe(1);
    expect(byCat['Categoria2']).toBe(2);

    // By organization (only current)
    expect(s.productsByOrganization.length).toBe(1);
    expect(s.productsByOrganization[0].count).toBe(3);
  });
});
