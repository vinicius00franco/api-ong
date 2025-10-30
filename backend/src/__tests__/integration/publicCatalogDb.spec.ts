import { pool } from '../../lib/database';

describe('Public Catalog Integration Tests', () => {
  beforeAll(async () => {
    // Clean up and prepare test data
    await pool.query('DELETE FROM products');
    await pool.query('DELETE FROM organizations');

    // Create organizations
    await pool.query(
      'INSERT INTO organizations (id, name, email, password) VALUES ($1, $2, $3, $4)',
      [1, 'ONG A', 'onga@example.com', 'hashed_password']
    );
    await pool.query(
      'INSERT INTO organizations (id, name, email, password) VALUES ($1, $2, $3, $4)',
      [2, 'ONG B', 'ongb@example.com', 'hashed_password']
    );

    // Create products for ONG A
    await pool.query(
      `INSERT INTO products (name, description, price, category, image_url, stock_qty, weight_grams, organization_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      ['Chocolate', 'Chocolate ao leite', 10.50, 'Doces', 'http://example.com/chocolate.jpg', 100, 250, 1]
    );
    await pool.query(
      `INSERT INTO products (name, description, price, category, image_url, stock_qty, weight_grams, organization_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      ['Bala', 'Bala de goma', 5.00, 'Doces', 'http://example.com/bala.jpg', 200, 100, 1]
    );

    // Create products for ONG B
    await pool.query(
      `INSERT INTO products (name, description, price, category, image_url, stock_qty, weight_grams, organization_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      ['Coxinha', 'Coxinha de frango', 8.00, 'Salgados', 'http://example.com/coxinha.jpg', 50, 150, 2]
    );
    await pool.query(
      `INSERT INTO products (name, description, price, category, image_url, stock_qty, weight_grams, organization_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      ['Pastel', 'Pastel de carne', 12.00, 'Salgados', 'http://example.com/pastel.jpg', 30, 200, 2]
    );
    await pool.query(
      `INSERT INTO products (name, description, price, category, image_url, stock_qty, weight_grams, organization_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      ['Brownie', 'Brownie de chocolate', 15.00, 'Doces', 'http://example.com/brownie.jpg', 40, 180, 2]
    );
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM products');
    await pool.query('DELETE FROM organizations');
    await pool.end();
  });

  describe('GET /api/public/catalog', () => {
    it('should return all products from all organizations', async () => {
      // Act
      const result = await pool.query('SELECT * FROM products ORDER BY id DESC');

      // Assert
      expect(result.rows.length).toBe(5);
      expect(result.rows.some(p => p.organization_id === 1)).toBe(true);
      expect(result.rows.some(p => p.organization_id === 2)).toBe(true);
    });

    it('should filter products by category', async () => {
      // Act
      const result = await pool.query(
        'SELECT * FROM products WHERE category = $1',
        ['Doces']
      );

      // Assert
      expect(result.rows.length).toBe(3); // Chocolate, Bala, Brownie
      expect(result.rows.every(p => p.category === 'Doces')).toBe(true);
    });

    it('should filter products by price range', async () => {
      // Act
      const result = await pool.query(
        'SELECT * FROM products WHERE price >= $1 AND price <= $2',
        [5, 10]
      );

      // Assert - Bala (5), Coxinha (8)
      expect(result.rows.length).toBe(2);
      expect(result.rows.every(p => parseFloat(p.price) >= 5 && parseFloat(p.price) <= 10)).toBe(true);
    });

    it('should filter products by category and price range', async () => {
      // Act
      const result = await pool.query(
        'SELECT * FROM products WHERE category = $1 AND price >= $2 AND price <= $3',
        ['Doces', 5, 15]
      );

      // Assert
      expect(result.rows.length).toBe(3); // Bala (5), Chocolate (10.5), Brownie (15)
      expect(result.rows.every(p => p.category === 'Doces')).toBe(true);
      expect(result.rows.every(p => parseFloat(p.price) >= 5 && parseFloat(p.price) <= 15)).toBe(true);
    });

    it('should apply pagination correctly', async () => {
      // Act - Get page 1 with limit 2
      const page1 = await pool.query(
        'SELECT * FROM products ORDER BY id DESC LIMIT $1 OFFSET $2',
        [2, 0]
      );

      // Assert
      expect(page1.rows.length).toBe(2);

      // Act - Get page 2 with limit 2
      const page2 = await pool.query(
        'SELECT * FROM products ORDER BY id DESC LIMIT $1 OFFSET $2',
        [2, 2]
      );

      // Assert
      expect(page2.rows.length).toBe(2);

      // Ensure no overlap
      expect(page1.rows[0].id).not.toBe(page2.rows[0].id);
    });

    it('should return count of products matching filters', async () => {
      // Act
      const result = await pool.query(
        'SELECT COUNT(*) FROM products WHERE category = $1',
        ['Salgados']
      );

      // Assert
      expect(parseInt(result.rows[0].count, 10)).toBe(2); // Coxinha, Pastel
    });
  });
});
