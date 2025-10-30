import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PublicProduct, PublicCatalogFilters } from './publicCatalogTypes';

export interface IPublicCatalogRepository {
  findPublicProducts(filters: PublicCatalogFilters): Promise<PublicProduct[]>;
  countPublicProducts(filters: Omit<PublicCatalogFilters, 'page' | 'limit'>): Promise<number>;
}

@Injectable()
export class PublicCatalogRepository implements IPublicCatalogRepository {
  constructor(private readonly db: Pool) {}

  async findPublicProducts(filters: PublicCatalogFilters): Promise<PublicProduct[]> {
    const { page = 1, limit = 20, category, price_min, price_max } = filters;
    
    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramCounter = 1;

    if (category) {
      whereClauses.push(`category = $${paramCounter++}`);
      params.push(category);
    }

    if (price_min !== undefined && price_max !== undefined) {
      whereClauses.push(`price >= $${paramCounter++} AND price <= $${paramCounter++}`);
      params.push(price_min, price_max);
    } else if (price_min !== undefined) {
      whereClauses.push(`price >= $${paramCounter++}`);
      params.push(price_min);
    } else if (price_max !== undefined) {
      whereClauses.push(`price <= $${paramCounter++}`);
      params.push(price_max);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    params.push(limit, offset);

    const query = `
      SELECT * FROM products
      ${whereClause}
      ORDER BY id DESC
      LIMIT $${paramCounter++} OFFSET $${paramCounter++}
    `;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async countPublicProducts(filters: Omit<PublicCatalogFilters, 'page' | 'limit'>): Promise<number> {
    const { category, price_min, price_max } = filters;
    
    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramCounter = 1;

    if (category) {
      whereClauses.push(`category = $${paramCounter++}`);
      params.push(category);
    }

    if (price_min !== undefined && price_max !== undefined) {
      whereClauses.push(`price >= $${paramCounter++} AND price <= $${paramCounter++}`);
      params.push(price_min, price_max);
    } else if (price_min !== undefined) {
      whereClauses.push(`price >= $${paramCounter++}`);
      params.push(price_min);
    } else if (price_max !== undefined) {
      whereClauses.push(`price <= $${paramCounter++}`);
      params.push(price_max);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = whereClauses.length > 0 
      ? `SELECT COUNT(*) FROM products ${whereClause}`
      : 'SELECT COUNT(*) FROM products';
    const result = await this.db.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }
}
