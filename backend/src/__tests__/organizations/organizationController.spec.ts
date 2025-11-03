import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { HttpExceptionFilter } from '../../lib/httpExceptionFilter';
import { OrganizationModule } from '../../organizations/organizationModule';
import { OrganizationService } from '../../organizations/organizationService';
import { JwtService } from '@nestjs/jwt';

describe('OrganizationController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [OrganizationModule],
    })
      .overrideProvider(OrganizationService)
      .useValue({
        createOrganizationWithOptionalAdmin: jest.fn().mockImplementation(async (dto: any) => ({
          id: 1,
          name: dto.name,
          email: dto.email,
          created_at: new Date().toISOString(),
        })),
        updateOrganization: jest.fn().mockResolvedValue({ id: 1, name: 'Updated', email: 'org@example.com' }),
        deleteOrganization: jest.fn().mockResolvedValue(true),
      })
      .overrideProvider(JwtService)
      .useValue({
        verify: jest.fn().mockReturnValue({ organization_id: 1, sub: '1', email: 'ong@example.com' }),
      } as Partial<JwtService>)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /organizations', () => {
    it('should create organization and return ApiResponse success', async () => {
      const payload = {
        name: 'Minha ONG',
        email: 'ong@example.com',
        password: 'secret123',
        admin: { name: 'Admin', email: 'admin@example.com', password: 'admin123' },
      };

      await request(app.getHttpServer())
        .post('/organizations')
        .send(payload)
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual(
            expect.objectContaining({
              success: true,
              data: expect.objectContaining({ id: 1, name: payload.name, email: payload.email }),
            }),
          );
        });
    });

    it('should validate input and return standardized 400', async () => {
      const invalid = { name: '', email: 'not-an-email', password: '123' };
      await request(app.getHttpServer())
        .post('/organizations')
        .send(invalid)
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual(
            expect.objectContaining({ success: false, message: expect.any(String) }),
          );
        });
    });
  });

  describe('PATCH /organizations/:id', () => {
    it('should update organization when authorized', async () => {
      const updates = { name: 'Updated' };
      await request(app.getHttpServer())
        .patch('/organizations/1')
        .set('Authorization', 'Bearer mock')
        .send(updates)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(
            expect.objectContaining({ success: true, data: expect.objectContaining({ id: 1, name: 'Updated' }) }),
          );
        });
    });
  });

  describe('DELETE /organizations/:id', () => {
    it('should delete organization when authorized', async () => {
      await request(app.getHttpServer())
        .delete('/organizations/1')
        .set('Authorization', 'Bearer mock')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(
            expect.objectContaining({ success: true, data: expect.objectContaining({ deleted: true }) }),
          );
        });
    });
  });
});
