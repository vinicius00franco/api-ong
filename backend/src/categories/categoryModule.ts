import { Module } from '@nestjs/common';
import { CategoryController } from './categoryController';
import { CategoryRepository } from './categoryRepository';

@Module({
  controllers: [CategoryController],
  providers: [
    {
      provide: CategoryRepository,
      useFactory: () => new CategoryRepository(),
    },
  ],
  exports: [CategoryRepository],
})
export class CategoryModule {}
