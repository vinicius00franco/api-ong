import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Pool } from 'pg';
import { OrganizationModule } from '../../organizations/organizationModule';
import { AuthGuard } from '../../middleware/authMiddleware';

jest.setTimeout(20000);

describe('Organization integration (create user under org)', () => {
  let app: INestApplication;
  let pool: Pool;
  let client: any;

  const guardState = { orgId: 1 };

  beforeAll(async () => {
    try {
      pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/ong_db' });
      await pool.query('SELECT 1');
    } catch (e) {
      test.skip('DB not available');
      return;
    }

    client = await pool.connect();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [OrganizationModule],
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
  });

  afterEach(async () => {
    await client.query('ROLLBACK');
  });

  it('POST /organizations/:id/users should create a user in the organization when org matches token', async () => {
    const userData = {
      name: 'Org Create User',
      email: `org-create-${Date.now()}@example.com`,
      password: 'password123',
      role: 'user' as const,
    };

    const response = await request(app.getHttpServer())
      .post(`/organizations/${guardState.orgId}/users`)
      .set('Content-Type', 'application/json')
      .send(userData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data.name).toBe(userData.name);
    expect(response.body.data.email).toBe(userData.email);
    expect(response.body.data.role).toBe(userData.role);
    expect(response.body.data.organizationId).toBe(guardState.orgId);

    const dbUser = await client.query('SELECT id, name, email, role, organization_id FROM users WHERE email = $1', [userData.email]);
    expect(dbUser.rows).toHaveLength(1);
    expect(dbUser.rows[0].organization_id).toBe(guardState.orgId);
  });

  it('should return 403 if token organization does not match path param', async () => {
    const userData = {
      name: 'Forbidden User',
      email: `forbidden-${Date.now()}@example.com`,
      password: 'password123',
    };

    // Temporarily change guard state
    const original = guardState.orgId;
    (guardState as any).orgId = 2;

    const response = await request(app.getHttpServer())
      .post(`/organizations/1/users`)
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(403);

    // restore
    (guardState as any).orgId = original;
  });

  it('should return 400 for invalid data', async () => {
    const invalidUserData = {
      name: '',
      email: 'not-an-email',
      password: '123',
    };

    await request(app.getHttpServer())
      .post(`/organizations/${guardState.orgId}/users`)
      .set('Content-Type', 'application/json')
      .send(invalidUserData)
      .expect(400);
  });

  it('should return 409 for duplicate email', async () => {
    const email = `dup-${Date.now()}@example.com`;
    const userData = { name: 'User1', email, password: 'password123' };

    await request(app.getHttpServer())
      .post(`/organizations/${guardState.orgId}/users`)
      .set('Content-Type', 'application/json')
      .send(userData)
      .expect(201);

    // create again
    await request(app.getHttpServer())
      .post(`/organizations/${guardState.orgId}/users`)
      .set('Content-Type', 'application/json')
      .send({ name: 'User2', email, password: 'password456' })
      .expect(409);
  });
});
