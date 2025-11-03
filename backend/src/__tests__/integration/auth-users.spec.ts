import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Pool } from 'pg';
import { AuthModule } from '../../auth/authModule';
import { AuthGuard } from '../../middleware/authMiddleware';

jest.setTimeout(20000);

describe('Auth integration (user creation)', () => {
  let app: INestApplication;
  let pool: Pool;
  let client: any;

  const guardState = { orgId: 1 };

  beforeAll(async () => {
    // Try connect to real DB, else skip
    try {
      pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/ong_db' });
      await pool.query('SELECT 1');
    } catch (e) {
      test.skip('DB not available');
      return;
    }

    client = await pool.connect();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
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
    // Start transaction
    await client.query('BEGIN');
  });

  afterEach(async () => {
    // Rollback transaction
    await client.query('ROLLBACK');
  });

  describe('POST /auth/users', () => {
    it('should create a user within the authenticated organization', async () => {
      const userData = {
        name: 'Test User',
        email: `testuser-${Date.now()}@example.com`,
        password: 'password123',
        role: 'user' as const,
      };

      const response = await request(app.getHttpServer())
        .post('/auth/users')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(userData.name);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.role).toBe(userData.role);
      expect(response.body.data.organizationId).toBe(guardState.orgId);

      // Verify user was created in database
      const dbUser = await client.query(
        'SELECT id, name, email, role, organization_id FROM users WHERE email = $1',
        [userData.email]
      );
      expect(dbUser.rows).toHaveLength(1);
      expect(dbUser.rows[0].name).toBe(userData.name);
      expect(dbUser.rows[0].email).toBe(userData.email);
      expect(dbUser.rows[0].role).toBe(userData.role);
      expect(dbUser.rows[0].organization_id).toBe(guardState.orgId);
    });

    it('should create a user with default role when role is not provided', async () => {
      const userData = {
        name: 'Default Role User',
        email: `defaultrole-${Date.now()}@example.com`,
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/users')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe('user');

      // Verify in database
      const dbUser = await client.query(
        'SELECT role FROM users WHERE email = $1',
        [userData.email]
      );
      expect(dbUser.rows[0].role).toBe('user');
    });

    it('should return 400 for invalid data', async () => {
      const invalidUserData = {
        name: '', // Invalid: empty name
        email: 'invalid-email', // Invalid: not an email
        password: '123', // Invalid: too short
      };

      const response = await request(app.getHttpServer())
        .post('/auth/users')
        .send(invalidUserData)
        .expect(400);

      // Just check that it returns 400, format may vary
      expect(response.status).toBe(400);
    });

    it('should return 409 for duplicate email', async () => {
      const email = `duplicate-${Date.now()}@example.com`;
      
      // First create a user via API
      const userData = {
        name: 'Test User',
        email: email,
        password: 'password123',
      };

      await request(app.getHttpServer())
        .post('/auth/users')
        .send(userData)
        .expect(201);

      // Try to create another with same email
      const duplicateUserData = {
        name: 'Another User',
        email: email,
        password: 'password456',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/users')
        .send(duplicateUserData)
        .expect(409);

      // Just check that it returns 409
      expect(response.status).toBe(409);
    });
  });
});