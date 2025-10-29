import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/authModule';
import { ProductModule } from './products/productModule';

@Module({
  imports: [
    ConfigModule.forRoot(),
    HealthModule,
    AuthModule,
    ProductModule,
  ],
})
export class AppModule {}
