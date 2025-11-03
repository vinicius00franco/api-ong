import { Test, TestingModule } from '@nestjs/testing';
import { CategoryRepository } from '../../categories/categoryRepository';
import { pool } from '../../lib/database';

jest.mock('../../lib/database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('CategoryRepository', () => {
  let repository: CategoryRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryRepository],
    }).compile();

    repository = module.get<CategoryRepository>(CategoryRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all categories', async () => {
      const mockCategories = [
        { id: 1, name: 'Category 1', created_at: new Date() },
        { id: 2, name: 'Category 2', created_at: new Date() },
      ];

      (pool.query as jest.Mock).mockResolvedValue({ rows: mockCategories });

      const result = await repository.findAll();

      expect(result).toEqual(mockCategories);
      expect(pool.query).toHaveBeenCalledWith('SELECT id, name, created_at FROM categories ORDER BY id', undefined);
    });

    it('should return empty array when no categories found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('exists', () => {
    it('should return true when category exists', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await repository.exists(1);

      expect(result).toBe(true);
      expect(pool.query).toHaveBeenCalledWith('SELECT 1 FROM categories WHERE id = $1', [1]);
    });

    it('should return false when category does not exist', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });

      const result = await repository.exists(999);

      expect(result).toBe(false);
      expect(pool.query).toHaveBeenCalledWith('SELECT 1 FROM categories WHERE id = $1', [999]);
    });
  });
});