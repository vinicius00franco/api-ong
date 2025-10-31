import { Injectable, Inject } from '@nestjs/common';
import { IPublicCatalogRepository } from './publicCatalogRepository';
import { PublicCatalogFilters, PublicCatalogResult } from './publicCatalogTypes';

@Injectable()
export class PublicCatalogService {
  constructor(
    @Inject('IPublicCatalogRepository')
    private readonly repository: IPublicCatalogRepository,
  ) {}

  async getPublicCatalog(filters: PublicCatalogFilters): Promise<PublicCatalogResult> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    // Run queries sequentially to preserve transactional AsyncLocalStorage context
    const products = await this.repository.findPublicProducts({ ...filters, page, limit });
    const total = await this.repository.countPublicProducts({
      category: filters.category,
      price_min: filters.price_min,
      price_max: filters.price_max,
    });

    return {
      products,
      total,
      page,
      limit,
    };
  }
}
