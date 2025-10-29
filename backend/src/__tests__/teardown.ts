import { pool } from '../lib/database';

afterAll(async () => {
  try {
    await pool.end();
  } catch {
    // ignore errors on teardown
  }
});
