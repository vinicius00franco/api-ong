import { Injectable } from '@nestjs/common';
import { getDb } from '../lib/dbContext';
import { IAuthRepository } from './authTypes';

@Injectable()
export class AuthRepository implements IAuthRepository {
  async findOrganizationByEmail(email: string): Promise<{ id: string; password_hash: string } | null> {
    const query = 'SELECT id, password_hash FROM organizations WHERE email = $1';
    const result = await getDb().query(query, [email]);
    return result.rows[0] || null;
  }
}