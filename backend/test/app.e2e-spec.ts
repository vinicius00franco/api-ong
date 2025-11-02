import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Set required environment variables for tests
    process.env.LLM_API_URL = 'http://localhost:8000/api/v1/parse-query-only';
    process.env.LLM_TIMEOUT = '3000';
    process.env.JWT_SECRET = 'test_jwt_secret';
    process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/ong_db';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /api/health -> { status: "ok" }', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
