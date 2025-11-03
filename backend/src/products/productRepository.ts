import { Injectable } from '@nestjs/common';
import { getDb } from '../lib/dbContext';
import { IProductRepository, Product, CreateProductRequest, UpdateProductRequest } from './productTypes';

@Injectable()
export class ProductRepository implements IProductRepository {
  async create(product: CreateProductRequest & { organizationId: string }): Promise<Product> {
    const query = `
      INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      product.name,
      product.description,
      product.price,
      product.categoryId,
      product.imageUrl,
      product.stockQty,
      product.weightGrams,
      product.organizationId,
    ];
    const result = await getDb().query(query, values);
    const row = result.rows[0];
    return this.mapRowToProduct(row);
  }

  async findAll(organizationId: string): Promise<Product[]> {
    const query = 'SELECT * FROM products WHERE organization_id = $1';
    const result = await getDb().query(query, [organizationId]);
    return result.rows.map(row => this.mapRowToProduct(row));
  }

  async findById(id: string, organizationId: string): Promise<Product | null> {
    const query = 'SELECT * FROM products WHERE id = $1 AND organization_id = $2';
    const result = await getDb().query(query, [id, organizationId]);
    return result.rows[0] ? this.mapRowToProduct(result.rows[0]) : null;
  }

  async update(id: string, organizationId: string, updates: UpdateProductRequest): Promise<Product | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fieldMapping: Record<string, string> = {
      name: 'name',
      description: 'description',
      price: 'price',
      categoryId: 'category_id',
      imageUrl: 'image_url',
      stockQty: 'stock_qty',
      weightGrams: 'weight_grams',
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbField = fieldMapping[key] || key;
        fields.push(`${dbField} = $${paramIndex}`);
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
    values.push(id, organizationId);

    const result = await getDb().query(query, values);
    return result.rows[0] ? this.mapRowToProduct(result.rows[0]) : null;
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const query = 'DELETE FROM products WHERE id = $1 AND organization_id = $2';
    const result = await getDb().query(query, [id, organizationId]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapRowToProduct(row: any): Product {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      categoryId: row.category_id,
      imageUrl: row.image_url,
      stockQty: row.stock_qty,
      weightGrams: row.weight_grams,
      organizationId: row.organization_id,
      createdAt: row.created_at,
    };
  }
}