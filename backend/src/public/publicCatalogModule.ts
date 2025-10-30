import { Module } from '@nestjs/common';
import { PublicCatalogController } from './publicCatalogController';
import { PublicCatalogService } from './publicCatalogService';
import { PublicCatalogRepository } from './publicCatalogRepository';

@Module({
  controllers: [PublicCatalogController],
  providers: [
    PublicCatalogService,
    {
      provide: 'IPublicCatalogRepository',
      useFactory: () => new PublicCatalogRepository(),
    },
  ],
})
export class PublicCatalogModule {}
