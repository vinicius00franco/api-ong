import { IProductRepository } from '@/repositories/IProductRepository'
import { Product, CreateProductRequest } from '@/types'
import { ValidationError, NotFoundError } from '@/lib/errors'

// Single Responsibility Principle - apenas lógica de negócio de produtos
export class ProductService {
  constructor(private productRepository: IProductRepository) {}

  async getByOrganization(organizationId: number, page = 1, limit = 10): Promise<Product[]> {
    const offset = (page - 1) * limit
    return this.productRepository.findByOrganization(organizationId, limit, offset)
  }

  async getById(id: number, organizationId: number): Promise<Product> {
    const product = await this.productRepository.findById(id, organizationId)
    if (!product) {
      throw new NotFoundError('Product not found')
    }
    return product
  }

  async create(data: CreateProductRequest, organizationId: number): Promise<Product> {
    this.validateProductData(data)
    return this.productRepository.create(data, organizationId)
  }

  async update(id: number, data: Partial<CreateProductRequest>, organizationId: number): Promise<Product> {
    const product = await this.productRepository.update(id, data, organizationId)
    if (!product) {
      throw new NotFoundError('Product not found')
    }
    return product
  }

  async delete(id: number, organizationId: number): Promise<void> {
    const deleted = await this.productRepository.delete(id, organizationId)
    if (!deleted) {
      throw new NotFoundError('Product not found')
    }
  }

  private validateProductData(data: CreateProductRequest): void {
    if (!data.name?.trim()) {
      throw new ValidationError('Product name is required')
    }
    if (data.price <= 0) {
      throw new ValidationError('Product price must be greater than 0')
    }
    if (data.stockQty < 0) {
      throw new ValidationError('Stock quantity cannot be negative')
    }
  }
}