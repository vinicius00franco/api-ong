import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { OrderModule } from '../../orders/orderModule';
import { OrderService } from '../../orders/orderService';
import { OrderRepository } from '../../orders/orderRepository';
import { ProductRepository } from '../../products/productRepository';
import { AuthGuard } from '../../middleware/authMiddleware';
import { Pool } from 'pg';

// Run these only when a real DB URL is available
const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;
jest.setTimeout(20000);

describeIfDb('Orders integration (real DB) with transactions', () => {
  let app: INestApplication;
  let pool: Pool;
  let client: any;

  // Minimal transactional repositories that use the provided client
  class TxOrderRepository {
    constructor(private client: any) {}

    async create(order: any) {
      // Insert order
      const orderQuery = `
        INSERT INTO orders (customer_id)
        VALUES ($1)
        RETURNING id, customer_id, created_at
      `;
      const orderValues = [order.customer_id];
      const orderResult = await this.client.query(orderQuery, orderValues);
      const newOrder = orderResult.rows[0];

      // Insert order items
      const items = [];
      for (const item of order.items) {
        // Get current product price
        const productQuery = 'SELECT price FROM products WHERE id = $1 AND organization_id = $2';
        const productResult = await this.client.query(productQuery, [item.product_id, order.organization_id]);
        if (productResult.rows.length === 0) {
          throw new Error(`Product ${item.product_id} not found or not accessible`);
        }
        const price = productResult.rows[0].price;

        const itemQuery = `
          INSERT INTO order_items (order_id, product_id, quantity, price_at_time, organization_id)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, order_id, product_id, quantity, price_at_time, organization_id, created_at
        `;
        const itemValues = [newOrder.id, item.product_id, item.quantity, price, order.organization_id];
        const itemResult = await this.client.query(itemQuery, itemValues);
        items.push(itemResult.rows[0]);
      }

      return {
        ...newOrder,
        organization_id: order.organization_id,
        items,
      };
    }

    async findAll(organization_id: number) {
      const query = `
        SELECT o.id, o.customer_id, o.created_at,
               oi.id as item_id, oi.product_id, oi.quantity, oi.price_at_time, oi.created_at as item_created_at,
               p.name as product_name, p.price as current_price
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.organization_id = $1
        ORDER BY o.created_at DESC, oi.id
      `;
      const result = await this.client.query(query, [organization_id]);

      const ordersMap = new Map();

      result.rows.forEach((row: any) => {
        if (!ordersMap.has(row.id)) {
          ordersMap.set(row.id, {
            id: row.id,
            customer_id: row.customer_id,
            organization_id,
            created_at: row.created_at,
            items: [],
          });
        }

        if (row.item_id) {
          ordersMap.get(row.id).items.push({
            id: row.item_id,
            order_id: row.id,
            product_id: row.product_id,
            quantity: row.quantity,
            price_at_time: row.price_at_time,
            organization_id,
            created_at: row.item_created_at,
            product: row.product_name ? {
              id: row.product_id,
              name: row.product_name,
              price: row.current_price,
            } : undefined,
          });
        }
      });

      return Array.from(ordersMap.values());
    }

    async findById(id: number, organization_id: number) {
      const query = `
        SELECT o.id, o.customer_id, o.created_at,
               oi.id as item_id, oi.product_id, oi.quantity, oi.price_at_time, oi.created_at as item_created_at,
               p.name as product_name, p.price as current_price
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.id = $1 AND oi.organization_id = $2
        ORDER BY oi.id
      `;
      const result = await this.client.query(query, [id, organization_id]);

      if (result.rows.length === 0) return null;

      const order = {
        id: result.rows[0].id,
        customer_id: result.rows[0].customer_id,
        organization_id,
        created_at: result.rows[0].created_at,
        items: result.rows.map((row: any) => ({
          id: row.item_id,
          order_id: row.id,
          product_id: row.product_id,
          quantity: row.quantity,
          price_at_time: row.price_at_time,
          organization_id,
          created_at: row.item_created_at,
          product: row.product_name ? {
            id: row.product_id,
            name: row.product_name,
            price: row.current_price,
          } : undefined,
        })),
      };

      return order;
    }
  }

  class TxProductRepository {
    constructor(private client: any) {}

    async findById(id: string, organization_id: string) {
      const query = 'SELECT * FROM products WHERE id = $1 AND organization_id = $2';
      const result = await this.client.query(query, [id, organization_id]);
      return result.rows[0] || null;
    }

    // Stub other methods to satisfy interface
    async create() { throw new Error('Not implemented'); }
    async findAll() { throw new Error('Not implemented'); }
    async update() { throw new Error('Not implemented'); }
    async delete() { throw new Error('Not implemented'); }
  }

  beforeAll(async () => {
    // quick connectivity check; if fails, skip
    try {
      pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/ong_db' });
      await pool.query('SELECT 1');
    } catch (e) {
      // no DB available, skip suite
      test.skip('DB not available');
      return;
    }

    // create a client dedicated for tests (we will BEGIN/ROLLBACK per test)
    client = await pool.connect();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [OrderModule],
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
      .overrideProvider(OrderRepository)
      .useValue(new TxOrderRepository(client))
      .overrideProvider(ProductRepository)
      .useValue(new TxProductRepository(client))
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

    // ensure products exist for the valid-case
    await client.query('DELETE FROM order_items');
    await client.query('DELETE FROM orders');
    await client.query('DELETE FROM products');
    await client.query('DELETE FROM categories');
    await client.query('INSERT INTO categories (id, name) VALUES ($1, $2)', [1, 'Doces']);
    // ensure organization id 1 exists for auth-mocked org
    await client.query('INSERT INTO organizations (id, name, email, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING', [1, 'ONG Seed', `seed+${Date.now()}@example.com`, 'hashed_password']);
    // insert test products
    await client.query('INSERT INTO products (id, name, price, category_id, stock_qty, weight_grams, organization_id) VALUES ($1, $2, $3, $4, $5, $6, $7)', [1, 'Test Product 1', 10.50, 1, 100, 500, 1]);
    await client.query('INSERT INTO products (id, name, price, category_id, stock_qty, weight_grams, organization_id) VALUES ($1, $2, $3, $4, $5, $6, $7)', [2, 'Test Product 2', 20.00, 1, 50, 300, 1]);
  });

  afterEach(async () => {
    // rollback all changes
    await client.query('ROLLBACK');
  });

  it('should create an order with valid products', async () => {
    const createDto = {
      customer_id: 1,
      items: [
        { product_id: 1, quantity: 2 },
        { product_id: 2, quantity: 1 },
      ],
    };

    const response = await request(app.getHttpServer())
      .post('/orders')
      .send(createDto)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      id: expect.any(Number),
      customer_id: 1,
      total: 41.00, // (10.50 * 2) + (20.00 * 1)
      items: expect.arrayContaining([
        expect.objectContaining({
          product_id: 1,
          quantity: 2,
          price_at_time: 10.50,
        }),
        expect.objectContaining({
          product_id: 2,
          quantity: 1,
          price_at_time: 20.00,
        }),
      ]),
    });
  });

  it('should return 400 for order with invalid product', async () => {
    const createDto = {
      customer_id: 1,
      items: [
        { product_id: 999, quantity: 1 }, // non-existent product
      ],
    };

    const response = await request(app.getHttpServer())
      .post('/orders')
      .send(createDto)
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should list orders for organization', async () => {
    // First create an order
    const createDto = {
      customer_id: 1,
      items: [{ product_id: 1, quantity: 1 }],
    };

    await request(app.getHttpServer())
      .post('/orders')
      .send(createDto)
      .expect(201);

    // Then list orders
    const response = await request(app.getHttpServer())
      .get('/orders')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      id: expect.any(Number),
      customer_id: 1,
      total: 10.50,
      items: expect.arrayContaining([
        expect.objectContaining({
          product_id: 1,
          quantity: 1,
          price_at_time: 10.50,
        }),
      ]),
    });
  });

  it('should get order by id', async () => {
    // First create an order
    const createDto = {
      customer_id: 1,
      items: [{ product_id: 1, quantity: 1 }],
    };

    const createResponse = await request(app.getHttpServer())
      .post('/orders')
      .send(createDto)
      .expect(201);

    const orderId = createResponse.body.data.id;

    // Then get by id
    const response = await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      id: orderId,
      customer_id: 1,
      total: 10.50,
      items: expect.arrayContaining([
        expect.objectContaining({
          product_id: 1,
          quantity: 1,
          price_at_time: 10.50,
        }),
      ]),
    });
  });

  it('should return 404 for non-existent order', async () => {
    const response = await request(app.getHttpServer())
      .get('/orders/999')
      .expect(404);

    expect(response.body.success).toBe(false);
  });
});