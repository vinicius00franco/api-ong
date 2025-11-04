import { Injectable, Logger } from '@nestjs/common';
import { pool } from '../lib/database';
import { PublicProduct } from '../public/publicCatalogTypes';
import { IAIFilters } from './searchTypes';

export interface ISearchRepository {
  findByText(term: string): Promise<PublicProduct[]>;
  findByTextFullText(term: string): Promise<PublicProduct[]>;
  findByFilters(filters: IAIFilters): Promise<PublicProduct[]>;
}

@Injectable()
export class SearchRepository implements ISearchRepository {
  private readonly logger = new Logger(SearchRepository.name);
  async findByText(term: string): Promise<PublicProduct[]> {
    const query = `
      SELECT p.id, p.name, p.description, p.price, c.name as category, p.image_url, p.stock_qty, p.weight_grams, p.organization_id
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE (
        p.name ILIKE $1 OR p.description ILIKE $1 OR c.name ILIKE $1
        OR unaccent(p.name) ILIKE unaccent($1)
        OR unaccent(p.description) ILIKE unaccent($1)
        OR unaccent(c.name) ILIKE unaccent($1)
      )
      ORDER BY p.id DESC
    `;
    const params = [`%${term}%`];
    const result = await pool.query(query, params);
    return result.rows;
  }

  async findByTextFullText(term: string): Promise<PublicProduct[]> {
    const query = `
      SELECT 
        p.id, p.name, p.description, p.price, 
        c.name as category, p.image_url, p.stock_qty, 
        p.weight_grams, p.organization_id,
        ts_rank(p.search_vector, plainto_tsquery('portuguese', $1)) as rank
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.search_vector @@ plainto_tsquery('portuguese', $1)
      ORDER BY rank DESC, p.id DESC
    `;
    const result = await pool.query(query, [term]);
    return result.rows;
  }

  async findByFilters(filters: IAIFilters): Promise<PublicProduct[]> {
    this.logger.log(JSON.stringify({ message: 'findByFilters called', filters }));
    const where: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (filters.search_term) {
      // Expand search to include category and unaccent for better matching
      where.push(
        `(
          p.name ILIKE $${i} OR p.description ILIKE $${i} OR c.name ILIKE $${i}
          OR unaccent(p.name) ILIKE unaccent($${i})
          OR unaccent(p.description) ILIKE unaccent($${i})
          OR unaccent(c.name) ILIKE unaccent($${i})
        )`,
      );
      params.push(`%${filters.search_term}%`);
      i += 1;
    }
    if (filters.category) {
      where.push(`c.name ILIKE $${i}`);
      params.push(`%${filters.category}%`);
      i += 1;
    }
    if (filters.price_min !== undefined) {
      where.push(`p.price >= $${i}`);
      params.push(filters.price_min);
      i += 1;
    }
    if (filters.price_max !== undefined) {
      where.push(`p.price <= $${i}`);
      params.push(filters.price_max);
      i += 1;
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const query = `
      SELECT p.id, p.name, p.description, p.price, c.name as category, p.image_url, p.stock_qty, p.weight_grams, p.organization_id
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.id DESC
    `;
    this.logger.log(JSON.stringify({ message: 'Executing query', query, params }));
    const result = await pool.query(query, params);
    this.logger.log(JSON.stringify({ message: 'Query result rows', count: result.rows.length }));
    return result.rows;
  }
}
