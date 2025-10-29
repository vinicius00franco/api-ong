import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, UsePipes } from '@nestjs/common';
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
  @UsePipes(new ZodValidationPipe(createProductSchema))
  async create(@Body() createProductInput: CreateProductInput, @Request() req: any): Promise<Product> {
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
  @UsePipes(new ZodValidationPipe(updateProductSchema))
  async update(@Param('id') id: string, @Body() updateProductInput: UpdateProductInput, @Request() req: any): Promise<Product> {
    return this.productService.update(id, req.organizationId, updateProductInput);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.productService.delete(id, req.organizationId);
  }
}