import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/authModule';
import { ProductController } from './productController';
import { ProductService } from './productService';
import { ProductRepository } from './productRepository';

@Module({
  imports: [AuthModule],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository],
})
export class ProductModule {}