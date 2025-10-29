import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Global prefix to align with existing API convention
  app.setGlobalPrefix('api');
  await app.listen(3000);
}
bootstrap();
