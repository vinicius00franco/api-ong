import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from '../../products/productService';
import { ProductRepository } from '../../products/productRepository';
import { CreateProductRequest, UpdateProductRequest } from '../../products/productTypes';
import { NotFoundException } from '@nestjs/common';
import { CategoryRepository } from '../../categories/categoryRepository';

describe('ProductService', () => {
  let service: ProductService;
  let productRepository: jest.Mocked<ProductRepository>;
  let categoryRepository: jest.Mocked<CategoryRepository>;

  beforeEach(async () => {
    const mockProductRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const mockCategoryRepository = {
      findAll: jest.fn(),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: ProductRepository,
          useValue: mockProductRepository,
        },
        {
          provide: CategoryRepository,
          useValue: mockCategoryRepository,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    productRepository = module.get(ProductRepository);
  categoryRepository = module.get(CategoryRepository);
  });

  describe('create', () => {
    it('should create a product', async () => {
      const createRequest: CreateProductRequest = {
        name: 'Test Product',
        description: 'Description',
        price: 10.99,
        category_id: 1,
        image_url: 'http://example.com/image.jpg',
        stock_qty: 100,
        weight_grams: 500,
      };
      const organizationId = 'org1';
      const createdProduct = { ...createRequest, id: '1', organization_id: organizationId, created_at: new Date() };

  categoryRepository.exists.mockResolvedValue(true);
  productRepository.create.mockResolvedValue(createdProduct);

      const result = await service.create(createRequest, organizationId);

      expect(result).toEqual(createdProduct);
      expect(productRepository.create).toHaveBeenCalledWith({ ...createRequest, organization_id: organizationId });
    });

    it('should throw BadRequest for invalid category_id', async () => {
      const createRequest: CreateProductRequest = {
        name: 'Test Product',
        description: 'Description',
        price: 10.99,
        category_id: 99999,
        image_url: 'http://example.com/image.jpg',
        stock_qty: 100,
        weight_grams: 500,
      };
      const organizationId = 'org1';
      categoryRepository.exists.mockResolvedValue(false);

      await expect(service.create(createRequest, organizationId)).rejects.toThrow('Invalid category_id');
      expect(categoryRepository.exists).toHaveBeenCalledWith(99999);
      expect(productRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all products for organization', async () => {
      const organizationId = 'org1';
      const products = [{
        id: '1',
        name: 'Product 1',
        description: 'Desc',
        price: 10,
        category_id: 1,
        image_url: 'url',
        stock_qty: 1,
        weight_grams: 1,
        organization_id: organizationId,
        created_at: new Date(),
      }];

      productRepository.findAll.mockResolvedValue(products);

      const result = await service.findAll(organizationId);

      expect(result).toEqual(products);
      expect(productRepository.findAll).toHaveBeenCalledWith(organizationId);
    });
  });

  describe('findById', () => {
    it('should return product if found', async () => {
      const id = '1';
      const organizationId = 'org1';
      const product = {
        id,
        name: 'Product 1',
        description: 'Desc',
        price: 10,
        category_id: 1,
        image_url: 'url',
        stock_qty: 1,
        weight_grams: 1,
        organization_id: organizationId,
        created_at: new Date(),
      };

      productRepository.findById.mockResolvedValue(product);

      const result = await service.findById(id, organizationId);

      expect(result).toEqual(product);
      expect(productRepository.findById).toHaveBeenCalledWith(id, organizationId);
    });

    it('should throw NotFoundException if not found', async () => {
      const id = '1';
      const organizationId = 'org1';

      productRepository.findById.mockResolvedValue(null);

      await expect(service.findById(id, organizationId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update product', async () => {
      const id = '1';
      const organizationId = 'org1';
      const updates: UpdateProductRequest = { name: 'Updated Name' };
      const updatedProduct = {
        id,
        name: 'Updated Name',
        description: 'Desc',
        price: 10,
        category_id: 1,
        image_url: 'url',
        stock_qty: 1,
        weight_grams: 1,
        organization_id: organizationId,
        created_at: new Date(),
      };

  categoryRepository.exists.mockResolvedValue(true);
  productRepository.update.mockResolvedValue(updatedProduct);

      const result = await service.update(id, organizationId, updates);

      expect(result).toEqual(updatedProduct);
      expect(productRepository.update).toHaveBeenCalledWith(id, organizationId, updates);
    });

    it('should throw BadRequest on update with invalid category_id', async () => {
      const id = '1';
      const organizationId = 'org1';
      const updates: UpdateProductRequest = { category_id: 99999 };
      categoryRepository.exists.mockResolvedValue(false);

      await expect(service.update(id, organizationId, updates)).rejects.toThrow('Invalid category_id');
      expect(categoryRepository.exists).toHaveBeenCalledWith(99999);
      expect(productRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if update fails', async () => {
      const id = '1';
      const organizationId = 'org1';
      const updates: UpdateProductRequest = { name: 'Updated Name' };

      productRepository.update.mockResolvedValue(null);

      await expect(service.update(id, organizationId, updates)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete product', async () => {
      const id = '1';
      const organizationId = 'org1';

      productRepository.delete.mockResolvedValue(true);

      await expect(service.delete(id, organizationId)).resolves.not.toThrow();
      expect(productRepository.delete).toHaveBeenCalledWith(id, organizationId);
    });

    it('should throw NotFoundException if delete fails', async () => {
      const id = '1';
      const organizationId = 'org1';

      productRepository.delete.mockResolvedValue(false);

      await expect(service.delete(id, organizationId)).rejects.toThrow(NotFoundException);
    });
  });
});