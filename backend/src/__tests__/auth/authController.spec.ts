import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuthModule } from '../../auth/authModule'; // Vou criar
import { AuthService } from '../../auth/authService';
import { AuthRepository } from '../../auth/authRepository';
import { JwtService } from '@nestjs/jwt';
import { HttpExceptionFilter } from '../../lib/httpExceptionFilter';

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
  // Registrar filtro global para padronizar erros
  app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/auth/login (POST)', () => {
    it('should return ApiResponse with access token on success', () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual(
            expect.objectContaining({
              success: true,
              data: expect.objectContaining({
                access_token: 'mock-token',
                organization_id: 'org1',
              }),
            })
          );
        });
    });

    it('should return standardized 400 for invalid input', () => {
      const invalidDto = { email: 'invalid-email', password: '123' };

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(invalidDto)
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual(
            expect.objectContaining({
              success: false,
              message: expect.any(String),
            })
          );
        });
    });
  });
});