import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { getDb } from '../lib/dbContext';

export interface CreateOrganizationDTO {
  name: string;
  email: string;
  password: string;
}

export interface UpdateOrganizationDTO {
  name?: string;
  email?: string;
  password?: string;
}

export interface CreateAdminDTO {
  name: string;
  email: string;
  password: string;
}

@Injectable()
export class OrganizationRepository {
  async createOrganization(dto: CreateOrganizationDTO) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const query = `
      INSERT INTO organizations (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, created_at
    `;
    const values = [dto.name, dto.email, passwordHash];
    const result = await getDb().query(query, values);
    return result.rows[0];
  }

  async updateOrganization(id: number, updates: UpdateOrganizationDTO) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.name) {
      fields.push(`name = $${idx++}`);
      values.push(updates.name);
    }
    if (updates.email) {
      fields.push(`email = $${idx++}`);
      values.push(updates.email);
    }
    if (updates.password) {
      const passwordHash = await bcrypt.hash(updates.password, 10);
      fields.push(`password_hash = $${idx++}`);
      values.push(passwordHash);
    }

    if (fields.length === 0) {
      const res = await getDb().query('SELECT id, name, email FROM organizations WHERE id = $1', [id]);
      return res.rows[0] ?? null;
    }

    values.push(id);
    const sql = `UPDATE organizations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, email`;
    const result = await getDb().query(sql, values);
    return result.rows[0] || null;
  }

  async deleteOrganization(id: number) {
    const result = await getDb().query('DELETE FROM organizations WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async createAdminUser(organizationId: number, dto: CreateAdminDTO) {
    const passHash = await bcrypt.hash(dto.password, 10);
    const query = `
      INSERT INTO users (name, email, password_hash, role, organization_id)
      VALUES ($1, $2, $3, 'admin', $4)
      RETURNING id, name, email, role, organization_id
    `;
    const values = [dto.name, dto.email, passHash, organizationId];
    const result = await getDb().query(query, values);
    return result.rows[0];
  }
}
