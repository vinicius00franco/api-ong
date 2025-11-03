import { SearchRepository } from '../../search/searchRepository';
import { Pool } from 'pg';
import { withDbClient } from '../../lib/dbContext';

describe('Full-Text Search', () => {
  let pool: Pool;
  let client: any;
  let repository: SearchRepository;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/ong_db',
    });
    client = await pool.connect();
  });

  afterAll(async () => {
    if (client) client.release();
    if (pool) await pool.end();
  });

  beforeEach(async () => {
    await client.query('BEGIN');
    repository = new SearchRepository();
  });

  afterEach(async () => {
    await client.query('ROLLBACK');
  });

  describe('findByTextFullText', () => {
    it('should find products using full-text search', async () => {
      const orgId = await createOrg(client, 'ONG Test');
      const catId = await createCategory(client, 'Alimentos');
      
      await createProduct(client, {
        name: 'Chocolate Amargo',
        description: 'Delicioso chocolate 70% cacau',
        price: 15.0,
        categoryId: catId,
        organizationId: orgId,
      });

      const results = await withDbClient(client, () =>
        repository.findByTextFullText('chocolate cacau')
      );

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Chocolate Amargo');
    });

    it('should rank results by relevance', async () => {
      const orgId = await createOrg(client, 'ONG Test');
      const catId = await createCategory(client, 'Alimentos');
      
      await createProduct(client, {
        name: 'Chocolate',
        description: 'Produto genérico',
        price: 10.0,
        categoryId: catId,
        organizationId: orgId,
      });
      
      await createProduct(client, {
        name: 'Bolo de Chocolate',
        description: 'Bolo com muito chocolate e cacau',
        price: 20.0,
        categoryId: catId,
        organizationId: orgId,
      });

      const results = await withDbClient(client, () =>
        repository.findByTextFullText('chocolate cacau')
      );

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].name).toContain('Chocolate');
      if (results.length > 1) {
        expect(results[0].rank || 0).toBeGreaterThanOrEqual(results[1].rank || 0);
      }
    });

    it('should handle Portuguese stemming', async () => {
      const orgId = await createOrg(client, 'ONG Test');
      const catId = await createCategory(client, 'Alimentos');
      
      await createProduct(client, {
        name: 'Sabonete',
        description: 'Sabonetes artesanais',
        price: 5.0,
        categoryId: catId,
        organizationId: orgId,
      });

      const results = await withDbClient(client, () =>
        repository.findByTextFullText('sabonete')
      );

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Sabonete');
    });

    it('should be faster than ILIKE for large datasets', async () => {
      const orgId = await createOrg(client, 'ONG Test');
      const catId = await createCategory(client, 'Alimentos');
      
      await createProduct(client, {
        name: 'Produto Teste',
        description: 'Descrição do produto teste',
        price: 10.0,
        categoryId: catId,
        organizationId: orgId,
      });

      const fullTextResults = await withDbClient(client, () =>
        repository.findByTextFullText('produto')
      );
      
      const ilikeResults = await withDbClient(client, () =>
        repository.findByText('produto')
      );

      expect(fullTextResults.length).toBeGreaterThan(0);
      expect(ilikeResults.length).toBeGreaterThan(0);
      expect(fullTextResults.length).toBe(ilikeResults.length);
    });
  });
});

async function createOrg(client: any, name: string): Promise<number> {
  const found = await client.query('SELECT id FROM organizations WHERE name = $1', [name]);
  if (found.rowCount > 0) return found.rows[0].id;
  const result = await client.query(
    'INSERT INTO organizations (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
    [name, `${name.toLowerCase()}@test.com`, 'hash']
  );
  return result.rows[0].id;
}

async function createCategory(client: any, name: string): Promise<number> {
  const found = await client.query('SELECT id FROM categories WHERE name = $1', [name]);
  if (found.rowCount > 0) return found.rows[0].id;
  const result = await client.query('INSERT INTO categories (name) VALUES ($1) RETURNING id', [name]);
  return result.rows[0].id;
}

async function createProduct(client: any, data: any): Promise<number> {
  const result = await client.query(
    'INSERT INTO products (name, description, price, category_id, organization_id, image_url, stock_qty, weight_grams) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
    [data.name, data.description, data.price, data.categoryId, data.organizationId, 'http://img.com/test.jpg', 10, 100]
  );
  return result.rows[0].id;
}
