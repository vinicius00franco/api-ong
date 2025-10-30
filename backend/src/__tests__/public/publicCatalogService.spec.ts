import { Test, TestingModule } from '@nestjs/testing';
import { PublicCatalogService } from '../../public/publicCatalogService';
import { IPublicCatalogRepository } from '../../public/publicCatalogRepository';

describe('PublicCatalogService', () => {
  let service: PublicCatalogService;
  let repository: IPublicCatalogRepository;

  const mockRepository: jest.Mocked<IPublicCatalogRepository> = {
    findPublicProducts: jest.fn(),
    countPublicProducts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicCatalogService,
        {
          provide: 'IPublicCatalogRepository',
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PublicCatalogService>(PublicCatalogService);
    repository = module.get<IPublicCatalogRepository>('IPublicCatalogRepository');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPublicCatalog', () => {
    it('should return paginated products with default values', async () => {
      // Arrange
      const mockProducts = [
        {
          id: 1,
          name: 'Produto A',
          description: 'Desc A',
          price: 10.5,
          category: 'Doces',
          image_url: 'http://example.com/a.jpg',
          stock_qty: 100,
          weight_grams: 250,
          organization_id: 1,
        },
      ];

      mockRepository.findPublicProducts.mockResolvedValue(mockProducts);
      mockRepository.countPublicProducts.mockResolvedValue(1);

      // Act
      const result = await service.getPublicCatalog({
        page: 1,
        limit: 20,
      });

      // Assert
      expect(result).toEqual({
        products: mockProducts,
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(repository.findPublicProducts).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
      expect(repository.countPublicProducts).toHaveBeenCalledWith({});
    });

    it('should return products filtered by category', async () => {
      // Arrange
      const mockProducts = [
        {
          id: 1,
          name: 'Produto A',
          description: 'Desc A',
          price: 10.5,
          category: 'Doces',
          image_url: 'http://example.com/a.jpg',
          stock_qty: 100,
          weight_grams: 250,
          organization_id: 1,
        },
      ];

      mockRepository.findPublicProducts.mockResolvedValue(mockProducts);
      mockRepository.countPublicProducts.mockResolvedValue(1);

      // Act
      const result = await service.getPublicCatalog({
        page: 1,
        limit: 10,
        category: 'Doces',
      });

      // Assert
      expect(result).toEqual({
        products: mockProducts,
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(repository.findPublicProducts).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        category: 'Doces',
      });
      expect(repository.countPublicProducts).toHaveBeenCalledWith({
        category: 'Doces',
      });
    });

    it('should return products filtered by price range', async () => {
      // Arrange
      const mockProducts = [
        {
          id: 1,
          name: 'Produto A',
          description: 'Desc A',
          price: 10.5,
          category: 'Doces',
          image_url: 'http://example.com/a.jpg',
          stock_qty: 100,
          weight_grams: 250,
          organization_id: 1,
        },
      ];

      mockRepository.findPublicProducts.mockResolvedValue(mockProducts);
      mockRepository.countPublicProducts.mockResolvedValue(1);

      // Act
      const result = await service.getPublicCatalog({
        page: 1,
        limit: 10,
        price_min: 5,
        price_max: 15,
      });

      // Assert
      expect(result).toEqual({
        products: mockProducts,
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(repository.findPublicProducts).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        price_min: 5,
        price_max: 15,
      });
      expect(repository.countPublicProducts).toHaveBeenCalledWith({
        price_min: 5,
        price_max: 15,
      });
    });

    it('should return products filtered by category and price range', async () => {
      // Arrange
      const mockProducts = [
        {
          id: 1,
          name: 'Produto A',
          description: 'Desc A',
          price: 10.5,
          category: 'Doces',
          image_url: 'http://example.com/a.jpg',
          stock_qty: 100,
          weight_grams: 250,
          organization_id: 1,
        },
      ];

      mockRepository.findPublicProducts.mockResolvedValue(mockProducts);
      mockRepository.countPublicProducts.mockResolvedValue(1);

      // Act
      const result = await service.getPublicCatalog({
        page: 1,
        limit: 10,
        category: 'Doces',
        price_min: 5,
        price_max: 15,
      });

      // Assert
      expect(result).toEqual({
        products: mockProducts,
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(repository.findPublicProducts).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        category: 'Doces',
        price_min: 5,
        price_max: 15,
      });
      expect(repository.countPublicProducts).toHaveBeenCalledWith({
        category: 'Doces',
        price_min: 5,
        price_max: 15,
      });
    });

    it('should apply pagination correctly with offset calculation', async () => {
      // Arrange
      const mockProducts: any[] = [];
      mockRepository.findPublicProducts.mockResolvedValue(mockProducts);
      mockRepository.countPublicProducts.mockResolvedValue(100);

      // Act
      const result = await service.getPublicCatalog({
        page: 3,
        limit: 10,
      });

      // Assert
      expect(result).toEqual({
        products: mockProducts,
        total: 100,
        page: 3,
        limit: 10,
      });
      expect(repository.findPublicProducts).toHaveBeenCalledWith({
        page: 3,
        limit: 10,
      });
    });

    it('should return empty array when no products found', async () => {
      // Arrange
      mockRepository.findPublicProducts.mockResolvedValue([]);
      mockRepository.countPublicProducts.mockResolvedValue(0);

      // Act
      const result = await service.getPublicCatalog({
        page: 1,
        limit: 20,
        category: 'Inexistente',
      });

      // Assert
      expect(result).toEqual({
        products: [],
        total: 0,
        page: 1,
        limit: 20,
      });
    });
  });
});
