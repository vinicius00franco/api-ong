import { ProductService } from '@/services/ProductService'
import { IProductRepository } from '@/repositories/IProductRepository'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { Product, CreateProductRequest } from '@/types'

// Mock do repositório
const mockProductRepository: jest.Mocked<IProductRepository> = {
  findByOrganization: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  search: jest.fn(),
  searchByText: jest.fn(),
}

describe('ProductService', () => {
  let productService: ProductService

  beforeEach(() => {
    productService = new ProductService(mockProductRepository)
    jest.clearAllMocks()
  })

  describe('create', () => {
    const validProductData: CreateProductRequest = {
      name: 'Test Product',
      description: 'Test Description',
      price: 10.50,
      categoryId: 1,
      imageUrl: 'http://example.com/image.jpg',
      stockQty: 100,
      weightGrams: 500
    }

    it('should create product with valid data', async () => {
      const expectedProduct: Product = {
        id: 1,
        ...validProductData,
        organizationId: 1,
        createdAt: new Date()
      }

      mockProductRepository.create.mockResolvedValue(expectedProduct)

      const result = await productService.create(validProductData, 1)

      expect(mockProductRepository.create).toHaveBeenCalledWith(validProductData, 1)
      expect(result).toEqual(expectedProduct)
    })

    it('should throw ValidationError for empty name', async () => {
      const invalidData = { ...validProductData, name: '' }

      await expect(productService.create(invalidData, 1))
        .rejects.toThrow(ValidationError)
    })

    it('should throw ValidationError for negative price', async () => {
      const invalidData = { ...validProductData, price: -10 }

      await expect(productService.create(invalidData, 1))
        .rejects.toThrow(ValidationError)
    })

    it('should throw ValidationError for negative stock', async () => {
      const invalidData = { ...validProductData, stockQty: -5 }

      await expect(productService.create(invalidData, 1))
        .rejects.toThrow(ValidationError)
    })
  })

  describe('getById', () => {
    it('should return product when found', async () => {
      const product: Product = {
        id: 1,
        name: 'Test Product',
        description: 'Test Description',
        price: 10.50,
        categoryId: 1,
        imageUrl: 'http://example.com/image.jpg',
        stockQty: 100,
        weightGrams: 500,
        organizationId: 1,
        createdAt: new Date()
      }

      mockProductRepository.findById.mockResolvedValue(product)

      const result = await productService.getById(1, 1)

      expect(mockProductRepository.findById).toHaveBeenCalledWith(1, 1)
      expect(result).toEqual(product)
    })

    it('should throw NotFoundError when product not found', async () => {
      mockProductRepository.findById.mockResolvedValue(null)

      await expect(productService.getById(1, 1))
        .rejects.toThrow(NotFoundError)
    })
  })

  describe('delete', () => {
    it('should delete product successfully', async () => {
      mockProductRepository.delete.mockResolvedValue(true)

      await expect(productService.delete(1, 1)).resolves.not.toThrow()
      expect(mockProductRepository.delete).toHaveBeenCalledWith(1, 1)
    })

    it('should throw NotFoundError when product not found', async () => {
      mockProductRepository.delete.mockResolvedValue(false)

      await expect(productService.delete(1, 1))
        .rejects.toThrow(NotFoundError)
    })
  })
})