import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrganizationRepository } from './organizationRepository';
import { CreateOrganizationInput, UpdateOrganizationInput } from './organizationSchemas';

@Injectable()
export class OrganizationService {
  constructor(private repo: OrganizationRepository) {}

  async createOrganizationWithOptionalAdmin(input: CreateOrganizationInput) {
    const org = await this.repo.createOrganization({
      name: input.name,
      email: input.email,
      password: input.password,
    });

    if (input.admin) {
      await this.repo.createAdminUser(org.id, input.admin);
    }

    return org;
  }

  async updateOrganization(id: number, updates: UpdateOrganizationInput) {
    const updated = await this.repo.updateOrganization(id, updates);
    if (!updated) throw new NotFoundException('Organization not found');
    return updated;
  }

  async deleteOrganization(id: number) {
    const ok = await this.repo.deleteOrganization(id);
    if (!ok) throw new NotFoundException('Organization not found');
    return true;
  }
}
