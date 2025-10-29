import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/authModule';
import { ProductModule } from './products/productModule';
import { CategoryModule } from './categories/categoryModule';

@Module({
  imports: [
    ConfigModule.forRoot(),
    HealthModule,
    AuthModule,
    ProductModule,
    CategoryModule,
  ],
})
export class AppModule {}
