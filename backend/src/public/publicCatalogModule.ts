import { Module } from '@nestjs/common';
import { PublicCatalogController } from './publicCatalogController';
import { PublicCatalogService } from './publicCatalogService';
import { PublicCatalogRepository } from './publicCatalogRepository';
import { pool } from '../lib/database';

@Module({
  controllers: [PublicCatalogController],
  providers: [
    PublicCatalogService,
    {
      provide: 'IPublicCatalogRepository',
      useFactory: () => new PublicCatalogRepository(pool),
    },
  ],
})
export class PublicCatalogModule {}
