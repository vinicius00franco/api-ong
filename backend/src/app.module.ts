import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/authModule';
import { ProductModule } from './products/productModule';
import { CategoryModule } from './categories/categoryModule';
import { PublicCatalogModule } from './public/publicCatalogModule';
import { SearchModule } from './search/searchModule';
import { OrderModule } from './orders/orderModule';
import { OrganizationModule } from './organizations/organizationModule';
import { pool } from './lib/database';
import { RequestLoggingMiddleware } from './lib/requestLoggingMiddleware';
import { DashboardModule } from './dashboard/dashboardModule';
import { RateLimitMiddleware } from './middleware/rateLimitMiddleware';

@Module({
  imports: [
    ConfigModule.forRoot(),
    HttpModule,
    HealthModule,
    AuthModule,
    ProductModule,
    CategoryModule,
    PublicCatalogModule,
    SearchModule,
    OrderModule,
    OrganizationModule,
    DashboardModule,
  ],
  providers: [
    {
      provide: 'DB',
      useValue: pool,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
    consumer.apply(RateLimitMiddleware).forRoutes('*');
  }
}
