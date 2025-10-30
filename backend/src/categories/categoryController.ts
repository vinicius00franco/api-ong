import { Controller, Get } from '@nestjs/common';
import { CategoryRepository } from './categoryRepository';
import { Category } from './categoryTypes';
import { HandleErrors } from '../lib/handleErrors';
import { ApiResponse } from '../lib/apiResponse';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  @Get()
  @HandleErrors()
  async list(): Promise<ApiResponse<Category[]>> {
    const result = await this.categoryRepository.findAll();
    return ApiResponse.success(result);
  }
}
