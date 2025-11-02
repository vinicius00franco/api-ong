import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/authModule';
import { ProductModule } from './products/productModule';
import { CategoryModule } from './categories/categoryModule';
import { PublicCatalogModule } from './public/publicCatalogModule';
import { SearchModule } from './search/searchModule';
import { OrderModule } from './orders/orderModule';
import { pool } from './lib/database';

@Module({
  imports: [
    ConfigModule.forRoot(),
    HealthModule,
    AuthModule,
    ProductModule,
    CategoryModule,
    PublicCatalogModule,
    SearchModule,
    OrderModule,
  ],
  providers: [
    {
      provide: 'DB',
      useValue: pool,
    },
  ],
})
export class AppModule {}
