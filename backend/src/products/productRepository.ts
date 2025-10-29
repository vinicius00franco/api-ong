import { Injectable } from '@nestjs/common';
import { getDb } from '../lib/dbContext';
import { IProductRepository, Product, CreateProductRequest, UpdateProductRequest } from './productTypes';

@Injectable()
export class ProductRepository implements IProductRepository {
  async create(product: CreateProductRequest & { organization_id: string }): Promise<Product> {
    const query = `
      INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      product.name,
      product.description,
      product.price,
      product.category_id,
      product.image_url,
      product.stock_qty,
      product.weight_grams,
      product.organization_id,
    ];
  const result = await getDb().query(query, values);
    return result.rows[0];
  }

  async findAll(organization_id: string): Promise<Product[]> {
    const query = 'SELECT * FROM products WHERE organization_id = $1';
  const result = await getDb().query(query, [organization_id]);
    return result.rows;
  }

  async findById(id: string, organization_id: string): Promise<Product | null> {
    const query = 'SELECT * FROM products WHERE id = $1 AND organization_id = $2';
  const result = await getDb().query(query, [id, organization_id]);
    return result.rows[0] || null;
  }

  async update(id: string, organization_id: string, updates: UpdateProductRequest): Promise<Product | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) return null;

    const query = `
      UPDATE products
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1}
      RETURNING *
    `;
    values.push(id, organization_id);

  const result = await getDb().query(query, values);
    return result.rows[0] || null;
  }

  async delete(id: string, organization_id: string): Promise<boolean> {
    const query = 'DELETE FROM products WHERE id = $1 AND organization_id = $2';
  const result = await getDb().query(query, [id, organization_id]);
    return (result.rowCount ?? 0) > 0;
  }
}