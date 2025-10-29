import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuthModule } from '../../auth/authModule'; // Vou criar
import { AuthService } from '../../auth/authService';
import { AuthRepository } from '../../auth/authRepository';
import { JwtService } from '@nestjs/jwt';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(AuthService)
      .useValue({
        login: jest.fn().mockResolvedValue({
          access_token: 'mock-token',
          organization_id: 'org1',
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/auth/login (POST)', () => {
    it('should return access token for valid login', () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('organization_id');
        });
    });

    it('should return 400 for invalid input', () => {
      const invalidDto = { email: 'invalid-email', password: '123' };

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(invalidDto)
        .expect(400);
    });
  });
});