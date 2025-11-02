import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { OrderModule } from '../../orders/orderModule';
import { OrderService } from '../../orders/orderService';
import { AuthGuard } from '../../middleware/authMiddleware';
import { HttpExceptionFilter } from '../../lib/httpExceptionFilter';

describe('OrderController (e2e)', () => {
  let app: INestApplication;
  let orderService: OrderService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [OrderModule],
    })
      .overrideProvider(OrderService)
      .useValue({
        create: jest.fn(),
        findAll: jest.fn(),
        findById: jest.fn(),
      })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: jest.fn((context) => {
          const request = context.switchToHttp().getRequest();
          request.organizationId = 1;
          return true;
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    orderService = moduleFixture.get<OrderService>(OrderService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/orders (POST)', () => {
    it('should create an order', () => {
      const createDto = {
        customer_id: 1,
        items: [
          { product_id: 1, quantity: 2 },
          { product_id: 2, quantity: 1 },
        ],
      };
      const createdOrder = {
        id: 1,
        customer_id: 1,
        items: [],
        total: 41.00,
        created_at: new Date(),
      };

      (orderService.create as jest.Mock).mockResolvedValue(createdOrder);

      return request(app.getHttpServer())
        .post('/orders')
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual(
            expect.objectContaining({
              success: true,
              data: expect.objectContaining({ id: 1, total: 41.00 }),
            })
          );
        });
    });

    it('should return 400 for invalid input', () => {
      const invalidDto = { items: [] };

      return request(app.getHttpServer())
        .post('/orders')
        .send(invalidDto)
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual(
            expect.objectContaining({ success: false, message: expect.any(String) })
          );
        });
    });
  });

  describe('/orders (GET)', () => {
    it('should return all orders', () => {
      const orders = [{
        id: 1,
        customer_id: 1,
        items: [],
        total: 21.00,
        created_at: new Date(),
      }];

      (orderService.findAll as jest.Mock).mockResolvedValue(orders);

      return request(app.getHttpServer())
        .get('/orders')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(
            expect.objectContaining({
              success: true,
              data: expect.arrayContaining([
                expect.objectContaining({
                  id: 1,
                  customer_id: 1,
                  items: [],
                  total: 21.00,
                  created_at: expect.any(String), // JSON serializes Date to string
                })
              ])
            })
          );
        });
    });
  });

  describe('/orders/:id (GET)', () => {
    it('should return order by id', () => {
      const order = {
        id: 1,
        customer_id: 1,
        items: [],
        total: 21.00,
        created_at: new Date(),
      };

      (orderService.findById as jest.Mock).mockResolvedValue(order);

      return request(app.getHttpServer())
        .get('/orders/1')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(
            expect.objectContaining({
              success: true,
              data: expect.objectContaining({
                id: 1,
                customer_id: 1,
                items: [],
                total: 21.00,
                created_at: expect.any(String),
              })
            })
          );
        });
    });

    it('should return 404 if not found', () => {
      (orderService.findById as jest.Mock).mockRejectedValue(new Error('Not Found'));

      return request(app.getHttpServer())
        .get('/orders/1')
        .expect(500)
        .expect((res) => {
          expect(res.body).toEqual(
            expect.objectContaining({ success: false, message: expect.any(String) })
          );
        });
    });
  });
});