import { Injectable } from '@nestjs/common';
import { getDb } from '../lib/dbContext';
import { Category, ICategoryRepository } from './categoryTypes';

@Injectable()
export class CategoryRepository implements ICategoryRepository {
  async findAll(): Promise<Category[]> {
    const result = await getDb().query('SELECT id, name, created_at FROM categories ORDER BY id');
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
    }));
  }

  async exists(id: number): Promise<boolean> {
    const result = await getDb().query('SELECT 1 FROM categories WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
