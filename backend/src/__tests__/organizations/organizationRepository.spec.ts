import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationRepository } from '../../organizations/organizationRepository';
import { pool } from '../../lib/database';

jest.mock('../../lib/database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('OrganizationRepository', () => {
  let repository: OrganizationRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganizationRepository],
    }).compile();

    repository = module.get<OrganizationRepository>(OrganizationRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('createOrganization should insert and return row', async () => {
    const created = { id: 1, name: 'ONG', email: 'ong@example.com', created_at: new Date() };
    (pool.query as jest.Mock).mockResolvedValue({ rows: [created] });

    const result = await repository.createOrganization({ name: 'ONG', email: 'ong@example.com', password: 'secret123' });

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO organizations'),
      expect.any(Array),
    );
    expect(result).toEqual(created);
  });

  it('updateOrganization should build dynamic update', async () => {
    const updated = { id: 1, name: 'New', email: 'new@example.com' };
    (pool.query as jest.Mock).mockResolvedValue({ rows: [updated] });

    const result = await repository.updateOrganization(1, { name: 'New', email: 'new@example.com' });

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE organizations SET'),
      expect.any(Array),
    );
    expect(result).toEqual(updated);
  });

  it('deleteOrganization should return true on rowCount > 0', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

    const result = await repository.deleteOrganization(1);
    expect(result).toBe(true);
  });

  it('createAdminUser should insert admin into users', async () => {
    const user = { id: 10, name: 'Admin', email: 'admin@example.com', role: 'admin', organization_id: 1 };
    (pool.query as jest.Mock).mockResolvedValue({ rows: [user] });

    const result = await repository.createAdminUser(1, { name: 'Admin', email: 'admin@example.com', password: 'admin123' });

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      expect.any(Array),
    );
    expect(result).toEqual(user);
  });
});
