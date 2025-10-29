import { Test, TestingModule } from '@nestjs/testing';
import { ProductRepository } from '../../products/productRepository';
import { pool } from '../../lib/database';

jest.mock('../../lib/database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('ProductRepository', () => {
  let repository: ProductRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductRepository],
    }).compile();

    repository = module.get<ProductRepository>(ProductRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a product', async () => {
      const productData = {
        name: 'Test Product',
        description: 'Description',
        price: 10.99,
        category_id: 1,
        image_url: 'http://example.com/image.jpg',
        stock_qty: 100,
        weight_grams: 500,
        organization_id: 'org1',
      };
      const createdProduct = { ...productData, id: '1', created_at: new Date(), updated_at: new Date() };

      (pool.query as jest.Mock).mockResolvedValue({ rows: [createdProduct] });

      const result = await repository.create(productData);

      expect(result).toEqual(createdProduct);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO products'),
        expect.any(Array)
      );
      // Ensure we are inserting category_id, not category
      const [sql] = (pool.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('(name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id)');
    });
  });

  describe('findAll', () => {
    it('should return all products for organization', async () => {
      const organizationId = 'org1';
      const products = [{ id: '1', name: 'Product 1', organization_id: organizationId }];

      (pool.query as jest.Mock).mockResolvedValue({ rows: products });

      const result = await repository.findAll(organizationId);

      expect(result).toEqual(products);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM products WHERE organization_id = $1',
        [organizationId]
      );
    });
  });

  describe('findById', () => {
    it('should return product if found', async () => {
      const id = '1';
      const organizationId = 'org1';
      const product = { id, name: 'Product 1', organization_id: organizationId };

      (pool.query as jest.Mock).mockResolvedValue({ rows: [product] });

      const result = await repository.findById(id, organizationId);

      expect(result).toEqual(product);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM products WHERE id = $1 AND organization_id = $2',
        [id, organizationId]
      );
    });

    it('should return null if not found', async () => {
      const id = '1';
      const organizationId = 'org1';

      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await repository.findById(id, organizationId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update product', async () => {
      const id = '1';
      const organizationId = 'org1';
      const updates = { name: 'Updated Name' };
      const updatedProduct = { id, name: 'Updated Name', organization_id: organizationId };

      (pool.query as jest.Mock).mockResolvedValue({ rows: [updatedProduct] });

      const result = await repository.update(id, organizationId, updates);

      expect(result).toEqual(updatedProduct);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE products'),
        expect.any(Array)
      );
      // Ensure updated_at is not referenced since schema doesn't have it
      const [updateSql] = (pool.query as jest.Mock).mock.calls.slice(-1)[0];
      expect(updateSql).not.toContain('updated_at');
    });

    it('should return null if no fields to update', async () => {
      const id = '1';
      const organizationId = 'org1';
      const updates = {};

      const result = await repository.update(id, organizationId, updates);

      expect(result).toBeNull();
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete product', async () => {
      const id = '1';
      const organizationId = 'org1';

      (pool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await repository.delete(id, organizationId);

      expect(result).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM products WHERE id = $1 AND organization_id = $2',
        [id, organizationId]
      );
    });

    it('should return false if not deleted', async () => {
      const id = '1';
      const organizationId = 'org1';

      (pool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });

      const result = await repository.delete(id, organizationId);

      expect(result).toBe(false);
    });
  });
});