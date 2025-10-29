import { Controller, Get } from '@nestjs/common';
import { CategoryRepository } from './categoryRepository';
import { Category } from './categoryTypes';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  @Get()
  async list(): Promise<Category[]> {
    return this.categoryRepository.findAll();
  }
}
