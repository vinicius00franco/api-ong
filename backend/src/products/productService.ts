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

  async create(product: CreateProductRequest, organizationId: number): Promise<Product> {
    if (!(await this.categoryRepository.exists(product.categoryId))) {
      throw new BadRequestException('Invalid categoryId');
    }
    return this.productRepository.create({ ...product, organizationId });
  }

  async findAll(organizationId: number): Promise<Product[]> {
    return this.productRepository.findAll(organizationId);
  }

  async findById(id: string, organizationId: number): Promise<Product> {
    const product = await this.productRepository.findById(id, organizationId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(id: string, organizationId: number, updates: UpdateProductRequest): Promise<Product> {
    if (updates.categoryId !== undefined) {
      if (!(await this.categoryRepository.exists(updates.categoryId))) {
        throw new BadRequestException('Invalid categoryId');
      }
    }
    const product = await this.productRepository.update(id, organizationId, updates);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async delete(id: string, organizationId: number): Promise<void> {
    const deleted = await this.productRepository.delete(id, organizationId);
    if (!deleted) {
      throw new NotFoundException('Product not found');
    }
  }
}