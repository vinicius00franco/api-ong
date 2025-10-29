import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from './productRepository';
import { Product, CreateProductRequest, UpdateProductRequest } from './productTypes';

@Injectable()
export class ProductService {
  constructor(private productRepository: ProductRepository) {}

  async create(product: CreateProductRequest, organizationId: string): Promise<Product> {
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