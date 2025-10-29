import { Injectable } from '@nestjs/common';
import { pool } from '../lib/database';
import { IAuthRepository } from './authTypes';

@Injectable()
export class AuthRepository implements IAuthRepository {
  async findOrganizationByEmail(email: string): Promise<{ id: string; password_hash: string } | null> {
    const query = 'SELECT id, password_hash FROM organizations WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }
}