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

    const [products, total] = await Promise.all([
      this.repository.findPublicProducts({ ...filters, page, limit }),
      this.repository.countPublicProducts({
        category: filters.category,
        price_min: filters.price_min,
        price_max: filters.price_max,
      }),
    ]);

    return {
      products,
      total,
      page,
      limit,
    };
  }
}
