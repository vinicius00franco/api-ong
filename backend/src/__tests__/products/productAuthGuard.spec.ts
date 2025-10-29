import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuthModule } from '../../auth/authModule';
import { ProductModule } from '../../products/productModule';

describe('Product routes AuthGuard integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule, ProductModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('GET /products without token should be 401 (guard active and DI OK)', async () => {
    await request(app.getHttpServer())
      .get('/products')
      .expect(401);
  });
});
