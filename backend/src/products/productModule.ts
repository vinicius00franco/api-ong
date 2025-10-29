import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/authModule';
import { ProductController } from './productController';
import { ProductService } from './productService';
import { ProductRepository } from './productRepository';
import { AuthGuard } from '../middleware/authMiddleware';

@Module({
  imports: [AuthModule],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository, AuthGuard],
})
export class ProductModule {}