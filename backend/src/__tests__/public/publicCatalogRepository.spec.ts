import { PublicCatalogRepository } from '../../public/publicCatalogRepository';
import { Pool } from 'pg';

describe('PublicCatalogRepository', () => {
  let repository: PublicCatalogRepository;
  let mockPool: any;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    };
    
    repository = new PublicCatalogRepository(mockPool as Pool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findPublicProducts', () => {
    it('should query products with pagination only', async () => {
      // Arrange
      const mockProducts = [
        {
          id: 1,
          name: 'Produto A',
          description: 'Desc A',
          price: '10.50',
          category: 'Doces',
          image_url: 'http://example.com/a.jpg',
          stock_qty: 100,
          weight_grams: 250,
          organization_id: 1,
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockProducts });

      // Act
      const result = await repository.findPublicProducts({
        page: 1,
        limit: 10,
      });

      // Assert
      expect(result).toEqual(mockProducts);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM products'),
        [10, 0]
      );
    });

    it('should query products with category filter', async () => {
      // Arrange
      const mockProducts = [
        {
          id: 1,
          name: 'Produto A',
          description: 'Desc A',
          price: '10.50',
          category: 'Doces',
          image_url: 'http://example.com/a.jpg',
          stock_qty: 100,
          weight_grams: 250,
          organization_id: 1,
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockProducts });

      // Act
      const result = await repository.findPublicProducts({
        page: 1,
        limit: 10,
        category: 'Doces',
      });

      // Assert
      expect(result).toEqual(mockProducts);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE category = $1'),
        ['Doces', 10, 0]
      );
    });

    it('should query products with price range filter', async () => {
      // Arrange
      const mockProducts = [
        {
          id: 1,
          name: 'Produto A',
          description: 'Desc A',
          price: '10.50',
          category: 'Doces',
          image_url: 'http://example.com/a.jpg',
          stock_qty: 100,
          weight_grams: 250,
          organization_id: 1,
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockProducts });

      // Act
      const result = await repository.findPublicProducts({
        page: 1,
        limit: 10,
        price_min: 5,
        price_max: 15,
      });

      // Assert
      expect(result).toEqual(mockProducts);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE price >= $1 AND price <= $2'),
        [5, 15, 10, 0]
      );
    });

    it('should query products with category and price range filters', async () => {
      // Arrange
      const mockProducts = [
        {
          id: 1,
          name: 'Produto A',
          description: 'Desc A',
          price: '10.50',
          category: 'Doces',
          image_url: 'http://example.com/a.jpg',
          stock_qty: 100,
          weight_grams: 250,
          organization_id: 1,
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockProducts });

      // Act
      const result = await repository.findPublicProducts({
        page: 1,
        limit: 10,
        category: 'Doces',
        price_min: 5,
        price_max: 15,
      });

      // Assert
      expect(result).toEqual(mockProducts);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE category = $1 AND price >= $2 AND price <= $3'),
        ['Doces', 5, 15, 10, 0]
      );
    });

    it('should calculate correct offset for page 3', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({ rows: [] });

      // Act
      await repository.findPublicProducts({
        page: 3,
        limit: 10,
      });

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [10, 20] // offset = (3 - 1) * 10 = 20
      );
    });

    it('should only apply price_min when price_max is not provided', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({ rows: [] });

      // Act
      await repository.findPublicProducts({
        page: 1,
        limit: 10,
        price_min: 5,
      });

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE price >= $1'),
        [5, 10, 0]
      );
    });

    it('should only apply price_max when price_min is not provided', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({ rows: [] });

      // Act
      await repository.findPublicProducts({
        page: 1,
        limit: 10,
        price_max: 15,
      });

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE price <= $1'),
        [15, 10, 0]
      );
    });
  });

  describe('countPublicProducts', () => {
    it('should count all products when no filters', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({ rows: [{ count: '100' }] });

      // Act
      const result = await repository.countPublicProducts({});

      // Assert
      expect(result).toBe(100);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) FROM products',
        []
      );
    });

    it('should count products filtered by category', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({ rows: [{ count: '10' }] });

      // Act
      const result = await repository.countPublicProducts({
        category: 'Doces',
      });

      // Assert
      expect(result).toBe(10);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE category = $1'),
        ['Doces']
      );
    });

    it('should count products filtered by price range', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({ rows: [{ count: '5' }] });

      // Act
      const result = await repository.countPublicProducts({
        price_min: 5,
        price_max: 15,
      });

      // Assert
      expect(result).toBe(5);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE price >= $1 AND price <= $2'),
        [5, 15]
      );
    });

    it('should count products filtered by category and price range', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({ rows: [{ count: '3' }] });

      // Act
      const result = await repository.countPublicProducts({
        category: 'Doces',
        price_min: 5,
        price_max: 15,
      });

      // Assert
      expect(result).toBe(3);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE category = $1 AND price >= $2 AND price <= $3'),
        ['Doces', 5, 15]
      );
    });
  });
});
