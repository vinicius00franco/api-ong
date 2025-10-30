import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { CategoryModule } from '../../categories/categoryModule';
import { CategoryRepository } from '../../categories/categoryRepository';
import { HttpExceptionFilter } from '../../lib/httpExceptionFilter';

describe('CategoryController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CategoryModule],
    })
      .overrideProvider(CategoryRepository)
      .useValue({
        findAll: jest.fn().mockResolvedValue([{ id: 1, name: 'Categoria1', created_at: new Date() }]),
      })
      .compile();

  app = moduleFixture.createNestApplication();
  app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /categories should return an array', async () => {
    // This is a thin e2e; real DB test is in integration suite
    await request(app.getHttpServer())
      .get('/categories')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual(
          expect.objectContaining({ success: true, data: expect.any(Array) })
        );
      });
  });
});
