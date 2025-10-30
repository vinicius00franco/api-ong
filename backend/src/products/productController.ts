import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '../middleware/authMiddleware';
import { ZodValidationPipe } from '../lib/zodValidationPipe';
import { ProductService } from './productService';
import { createProductSchema, updateProductSchema, CreateProductInput, UpdateProductInput } from './productSchemas';
import { Product } from './productTypes';
import { HandleErrors } from '../lib/handleErrors';
import { ApiResponse } from '../lib/apiResponse';

@Controller('products')
@UseGuards(AuthGuard)
export class ProductController {
  constructor(private productService: ProductService) {}

  @Post()
  @HandleErrors()
  async create(
    @Body(new ZodValidationPipe(createProductSchema)) createProductInput: CreateProductInput,
    @Request() req: any,
  ): Promise<ApiResponse<Product>> {
    const result = await this.productService.create(createProductInput, req.organizationId);
    return ApiResponse.success(result);
  }

  @Get()
  @HandleErrors()
  async findAll(@Request() req: any): Promise<ApiResponse<Product[]>> {
    const result = await this.productService.findAll(req.organizationId);
    return ApiResponse.success(result);
  }

  @Get(':id')
  @HandleErrors()
  async findById(@Param('id') id: string, @Request() req: any): Promise<ApiResponse<Product>> {
    const result = await this.productService.findById(id, req.organizationId);
    return ApiResponse.success(result);
  }

  @Put(':id')
  @HandleErrors()
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) updateProductInput: UpdateProductInput,
    @Request() req: any,
  ): Promise<ApiResponse<Product>> {
    const result = await this.productService.update(id, req.organizationId, updateProductInput);
    return ApiResponse.success(result);
  }

  @Delete(':id')
  @HandleErrors()
  async delete(@Param('id') id: string, @Request() req: any): Promise<ApiResponse<void>> {
    await this.productService.delete(id, req.organizationId);
    return ApiResponse.success(undefined);
  }
}