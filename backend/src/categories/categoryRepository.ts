import { Injectable } from '@nestjs/common';
import { pool } from '../lib/database';
import { Category, ICategoryRepository } from './categoryTypes';

@Injectable()
export class CategoryRepository implements ICategoryRepository {
  async findAll(): Promise<Category[]> {
    const result = await pool.query('SELECT id, name, created_at FROM categories ORDER BY id');
    return result.rows;
  }

  async exists(id: number): Promise<boolean> {
    const result = await pool.query('SELECT 1 FROM categories WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
