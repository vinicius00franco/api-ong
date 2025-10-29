import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductRepository } from './productRepository';
import { Product, CreateProductRequest, UpdateProductRequest } from './productTypes';
import { CategoryRepository } from '../categories/categoryRepository';

@Injectable()
export class ProductService {
  constructor(
    private productRepository: ProductRepository,
    private categoryRepository: CategoryRepository,
  ) {}

  async create(product: CreateProductRequest, organizationId: string): Promise<Product> {
    if (!(await this.categoryRepository.exists(product.category_id))) {
      throw new BadRequestException('Invalid category_id');
    }
    return this.productRepository.create({ ...product, organization_id: organizationId });
  }

  async findAll(organizationId: string): Promise<Product[]> {
    return this.productRepository.findAll(organizationId);
  }

  async findById(id: string, organizationId: string): Promise<Product> {
    const product = await this.productRepository.findById(id, organizationId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(id: string, organizationId: string, updates: UpdateProductRequest): Promise<Product> {
    if (updates.category_id !== undefined) {
      if (!(await this.categoryRepository.exists(updates.category_id))) {
        throw new BadRequestException('Invalid category_id');
      }
    }
    const product = await this.productRepository.update(id, organizationId, updates);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const deleted = await this.productRepository.delete(id, organizationId);
    if (!deleted) {
      throw new NotFoundException('Product not found');
    }
  }
}