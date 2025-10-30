import { Test, TestingModule } from '@nestjs/testing';
import { PublicCatalogController } from '../../public/publicCatalogController';
import { PublicCatalogService } from '../../public/publicCatalogService';
import { ApiResponse } from '../../lib/apiResponse';

describe('PublicCatalogController', () => {
  let controller: PublicCatalogController;
  let service: PublicCatalogService;

  const mockService = {
    getPublicCatalog: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicCatalogController],
      providers: [
        {
          provide: PublicCatalogService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<PublicCatalogController>(PublicCatalogController);
    service = module.get<PublicCatalogService>(PublicCatalogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/public/catalog', () => {
    it('should return paginated products from all organizations', async () => {
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
        {
          id: 2,
          name: 'Produto B',
          description: 'Desc B',
          price: 20.0,
          category: 'Salgados',
          image_url: 'http://example.com/b.jpg',
          stock_qty: 50,
          weight_grams: 300,
          organization_id: 2,
        },
      ];

      mockService.getPublicCatalog.mockResolvedValue({
        products: mockProducts,
        total: 2,
        page: 1,
        limit: 10,
      });

      // Act
      const result = await controller.getCatalog({
        page: 1,
        limit: 10,
      });

      // Assert
      expect(result).toEqual(
        ApiResponse.success({
          products: mockProducts,
          total: 2,
          page: 1,
          limit: 10,
        })
      );
      expect(service.getPublicCatalog).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
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

      mockService.getPublicCatalog.mockResolvedValue({
        products: mockProducts,
        total: 1,
        page: 1,
        limit: 10,
      });

      // Act
      const result = await controller.getCatalog({
        page: 1,
        limit: 10,
        category: 'Doces',
      });

      // Assert
      expect(result).toEqual(
        ApiResponse.success({
          products: mockProducts,
          total: 1,
          page: 1,
          limit: 10,
        })
      );
      expect(service.getPublicCatalog).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
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

      mockService.getPublicCatalog.mockResolvedValue({
        products: mockProducts,
        total: 1,
        page: 1,
        limit: 10,
      });

      // Act
      const result = await controller.getCatalog({
        page: 1,
        limit: 10,
        price_min: 5,
        price_max: 15,
      });

      // Assert
      expect(result).toEqual(
        ApiResponse.success({
          products: mockProducts,
          total: 1,
          page: 1,
          limit: 10,
        })
      );
      expect(service.getPublicCatalog).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
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

      mockService.getPublicCatalog.mockResolvedValue({
        products: mockProducts,
        total: 1,
        page: 1,
        limit: 10,
      });

      // Act
      const result = await controller.getCatalog({
        page: 1,
        limit: 10,
        category: 'Doces',
        price_min: 5,
        price_max: 15,
      });

      // Assert
      expect(result).toEqual(
        ApiResponse.success({
          products: mockProducts,
          total: 1,
          page: 1,
          limit: 10,
        })
      );
      expect(service.getPublicCatalog).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        category: 'Doces',
        price_min: 5,
        price_max: 15,
      });
    });

    it('should use default pagination values when not provided', async () => {
      // Arrange
      mockService.getPublicCatalog.mockResolvedValue({
        products: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      // Act
      const result = await controller.getCatalog({
        page: 1,
        limit: 20,
      });

      // Assert
      expect(service.getPublicCatalog).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
      expect(result.success).toBe(true);
    });

    it('should return empty array when no products match filters', async () => {
      // Arrange
      mockService.getPublicCatalog.mockResolvedValue({
        products: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      // Act
      const result = await controller.getCatalog({
        page: 1,
        limit: 10,
        category: 'Inexistente',
      });

      // Assert
      expect(result).toEqual(
        ApiResponse.success({
          products: [],
          total: 0,
          page: 1,
          limit: 10,
        })
      );
    });
  });
});
