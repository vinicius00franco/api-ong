import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '../middleware/authMiddleware';
import { ZodValidationPipe } from '../lib/zodValidationPipe';
import { ProductService } from './productService';
import { createProductSchema, updateProductSchema, CreateProductInput, UpdateProductInput } from './productSchemas';
import { Product } from './productTypes';

@Controller('products')
@UseGuards(AuthGuard)
export class ProductController {
  constructor(private productService: ProductService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createProductSchema)) createProductInput: CreateProductInput,
    @Request() req: any,
  ): Promise<Product> {
    return this.productService.create(createProductInput, req.organizationId);
  }

  @Get()
  async findAll(@Request() req: any): Promise<Product[]> {
    return this.productService.findAll(req.organizationId);
  }

  @Get(':id')
  async findById(@Param('id') id: string, @Request() req: any): Promise<Product> {
    return this.productService.findById(id, req.organizationId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) updateProductInput: UpdateProductInput,
    @Request() req: any,
  ): Promise<Product> {
    return this.productService.update(id, req.organizationId, updateProductInput);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.productService.delete(id, req.organizationId);
  }
}