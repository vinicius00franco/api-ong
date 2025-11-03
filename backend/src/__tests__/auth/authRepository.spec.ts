import { Test, TestingModule } from '@nestjs/testing';
import { AuthRepository } from '../../auth/authRepository';
import { pool } from '../../lib/database';

jest.mock('../../lib/database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('AuthRepository', () => {
  let repository: AuthRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthRepository],
    }).compile();

    repository = module.get<AuthRepository>(AuthRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOrganizationByEmail', () => {
    it('should return organization when found', async () => {
      const mockOrganization = { id: 'org1', password_hash: 'hash' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockOrganization] });

      const result = await repository.findOrganizationByEmail('test@example.com');

      expect(result).toEqual({ id: 'org1', passwordHash: 'hash' });
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT id, password_hash FROM organizations WHERE email = $1',
        ['test@example.com']
      );
    });

    it('should return null when not found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await repository.findOrganizationByEmail('notfound@example.com');

      expect(result).toBeNull();
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT id, password_hash FROM organizations WHERE email = $1',
        ['notfound@example.com']
      );
    });
  });
});