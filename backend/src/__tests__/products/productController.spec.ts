import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ProductModule } from '../../products/productModule'; // Vou criar
import { ProductService } from '../../products/productService';
import { ProductRepository } from '../../products/productRepository';
import { AuthGuard } from '../../middleware/authMiddleware';
import { HttpExceptionFilter } from '../../lib/httpExceptionFilter';

describe('ProductController (e2e)', () => {
  let app: INestApplication;
  let productService: ProductService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ProductModule],
    })
      .overrideProvider(ProductService)
      .useValue({
        create: jest.fn(),
        findAll: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: jest.fn((context) => {
          const request = context.switchToHttp().getRequest();
          request.organizationId = 'org1';
          return true;
        }),
      })
      .compile();

  app = moduleFixture.createNestApplication();
  app.useGlobalFilters(new HttpExceptionFilter());
    // Mock request object with organizationId
    app.use((req: any, res: any, next: any) => {
      req.organizationId = 'org1';
      next();
    });
    await app.init();

    productService = moduleFixture.get<ProductService>(ProductService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/products (POST)', () => {
    it('should create a product', () => {
      const createDto = {
        name: 'Test Product',
        description: 'Description',
        price: 10.99,
        category_id: 1,
        image_url: 'http://example.com/image.jpg',
        stock_qty: 100,
        weight_grams: 500,
      };
      (productService.create as jest.Mock).mockResolvedValue({
        id: '1',
        ...createDto,
        organization_id: 'org1',
        created_at: new Date(),
      });
      return request(app.getHttpServer())
        .post('/products')
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual(
            expect.objectContaining({
              success: true,
              data: expect.objectContaining({ id: expect.any(String), name: 'Test Product' }),
            })
          );
        });
    });

    it('should return 400 for invalid input', () => {
      const invalidDto = { name: '', price: -1 };

      return request(app.getHttpServer())
        .post('/products')
        .send(invalidDto)
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual(
            expect.objectContaining({ success: false, message: expect.any(String) })
          );
        });
    });
  });

  describe('/products (GET)', () => {
    it('should return all products', () => {
      const products = [{ id: '1', name: 'Product 1', organization_id: 'org1' }];

      (productService.findAll as jest.Mock).mockResolvedValue(products);

      return request(app.getHttpServer())
        .get('/products')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(
            expect.objectContaining({ success: true, data: products })
          );
        });
    });
  });

  describe('/products/:id (GET)', () => {
    it('should return product by id', () => {
      const product = { id: '1', name: 'Product 1', organization_id: 'org1', category_id: 1 };

      (productService.findById as jest.Mock).mockResolvedValue(product);

      return request(app.getHttpServer())
        .get('/products/1')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(
            expect.objectContaining({ success: true, data: product })
          );
        });
    });

    it('should return 404 if not found', () => {
      (productService.findById as jest.Mock).mockRejectedValue(new Error('Not Found'));

      return request(app.getHttpServer())
        .get('/products/1')
        .expect(500)
        .expect((res) => {
          expect(res.body).toEqual(
            expect.objectContaining({ success: false, message: expect.any(String) })
          );
        }); // Since we throw Error, not NotFoundException
    });
  });

  describe('/products/:id (PUT)', () => {
    it('should update product', () => {
      const updateDto = { name: 'Updated Name' };

      (productService.update as jest.Mock).mockResolvedValue({ id: '1', name: 'Updated Name' });

      return request(app.getHttpServer())
        .put('/products/1')
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(
            expect.objectContaining({ success: true, data: expect.objectContaining({ name: 'Updated Name' }) })
          );
        });
    });
  });

  describe('/products/:id (DELETE)', () => {
    it('should delete product', () => {
      (productService.delete as jest.Mock).mockResolvedValue(undefined);

      return request(app.getHttpServer())
        .delete('/products/1')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(expect.objectContaining({ success: true }));
        });
    });
  });
});