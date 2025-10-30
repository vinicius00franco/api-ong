import { Injectable } from '@nestjs/common';
import { getDb } from '../lib/dbContext';
import { PublicProduct, PublicCatalogFilters } from './publicCatalogTypes';

export interface IPublicCatalogRepository {
  findPublicProducts(filters: PublicCatalogFilters): Promise<PublicProduct[]>;
  countPublicProducts(filters: Omit<PublicCatalogFilters, 'page' | 'limit'>): Promise<number>;
}

@Injectable()
export class PublicCatalogRepository implements IPublicCatalogRepository {

  async findPublicProducts(filters: PublicCatalogFilters): Promise<PublicProduct[]> {
    const { page = 1, limit = 20, category, price_min, price_max } = filters;
    
    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramCounter = 1;

    if (category) {
      whereClauses.push(`c.name = $${paramCounter++}`);
      params.push(category);
    }

    if (price_min !== undefined && price_max !== undefined) {
      whereClauses.push(`p.price >= $${paramCounter++} AND p.price <= $${paramCounter++}`);
      params.push(price_min, price_max);
    } else if (price_min !== undefined) {
      whereClauses.push(`p.price >= $${paramCounter++}`);
      params.push(price_min);
    } else if (price_max !== undefined) {
      whereClauses.push(`p.price <= $${paramCounter++}`);
      params.push(price_max);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    params.push(limit, offset);

    const query = `
      SELECT p.id, p.name, p.description, p.price, c.name as category, p.image_url, p.stock_qty, p.weight_grams, p.organization_id
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.id DESC
      LIMIT $${paramCounter++} OFFSET $${paramCounter++}
    `;

    const result = await getDb().query(query, params);
    return result.rows;
  }

  async countPublicProducts(filters: Omit<PublicCatalogFilters, 'page' | 'limit'>): Promise<number> {
    const { category, price_min, price_max } = filters;
    
    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramCounter = 1;

    if (category) {
      whereClauses.push(`c.name = $${paramCounter++}`);
      params.push(category);
    }

    if (price_min !== undefined && price_max !== undefined) {
      whereClauses.push(`p.price >= $${paramCounter++} AND p.price <= $${paramCounter++}`);
      params.push(price_min, price_max);
    } else if (price_min !== undefined) {
      whereClauses.push(`p.price >= $${paramCounter++}`);
      params.push(price_min);
    } else if (price_max !== undefined) {
      whereClauses.push(`p.price <= $${paramCounter++}`);
      params.push(price_max);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `SELECT COUNT(*) FROM products p LEFT JOIN categories c ON p.category_id = c.id ${whereClause}`;
    const result = await getDb().query(query, params);
    return parseInt(result.rows[0].count, 10);
  }
}
