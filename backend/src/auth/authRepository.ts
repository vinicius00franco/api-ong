import { Injectable } from '@nestjs/common';
import { getDb } from '../lib/dbContext';
import { IAuthRepository, User, CreateUserRequest, UpdateUserRequest } from './authTypes';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthRepository implements IAuthRepository {
  async findOrganizationByEmail(email: string): Promise<{ id: string; password_hash: string } | null> {
    const query = 'SELECT id, password_hash FROM organizations WHERE email = $1';
    const result = await getDb().query(query, [email]);
    return result.rows[0] || null;
  }

  async createOrganization(name: string, email: string, password: string): Promise<{ id: number; name: string; email: string }> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO organizations (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email
    `;
    const result = await getDb().query(query, [name, email, hashedPassword]);
    return result.rows[0];
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const query = 'SELECT id, name, email, password_hash, role, organization_id, created_at FROM users WHERE email = $1';
    const result = await getDb().query(query, [email]);
    return result.rows[0] || null;
  }

  async createUser(user: CreateUserRequest): Promise<User> {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const query = `
      INSERT INTO users (name, email, password_hash, role, organization_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, password_hash, role, organization_id, created_at
    `;
    const values = [user.name, user.email, hashedPassword, user.role || 'user', user.organization_id];
    const result = await getDb().query(query, values);
    return result.rows[0];
  }

  async updateUser(id: number, updates: UpdateUserRequest): Promise<User | null> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.email) {
      fields.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }
    if (updates.password) {
      const hashedPassword = await bcrypt.hash(updates.password, 10);
      fields.push(`password_hash = $${paramIndex++}`);
      values.push(hashedPassword);
    }
    if (updates.role) {
      fields.push(`role = $${paramIndex++}`);
      values.push(updates.role);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, email, password_hash, role, organization_id, created_at`;
    const result = await getDb().query(query, values);
    return result.rows[0] || null;
  }

  async deleteUser(id: number): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await getDb().query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }
}