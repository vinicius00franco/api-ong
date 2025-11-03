import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationService } from '../../organizations/organizationService';
import { OrganizationRepository } from '../../organizations/organizationRepository';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let repo: jest.Mocked<OrganizationRepository>;

  beforeEach(async () => {
    const repoMock = {
      createOrganization: jest.fn(),
      updateOrganization: jest.fn(),
      deleteOrganization: jest.fn(),
      createAdminUser: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: OrganizationRepository, useValue: repoMock },
      ],
    }).compile();

    service = module.get(OrganizationService);
    repo = module.get(OrganizationRepository);
  });

  it('should create organization and optional admin', async () => {
    repo.createOrganization.mockResolvedValue({ id: 1, name: 'ONG', email: 'ong@example.com' } as any);
    repo.createAdminUser.mockResolvedValue({ id: 10 } as any);

    const result = await service.createOrganizationWithOptionalAdmin({
      name: 'ONG',
      email: 'ong@example.com',
      password: 'secret123',
      admin: { name: 'Admin', email: 'admin@example.com', password: 'admin123' },
    });

    expect(repo.createOrganization).toHaveBeenCalled();
    expect(repo.createAdminUser).toHaveBeenCalledWith(1, expect.any(Object));
    expect(result).toEqual(expect.objectContaining({ id: 1 }));
  });

  it('should update organization', async () => {
    repo.updateOrganization.mockResolvedValue({ id: 1, name: 'New' } as any);
    const result = await service.updateOrganization(1, { name: 'New' });
    expect(repo.updateOrganization).toHaveBeenCalledWith(1, { name: 'New' });
    expect(result).toEqual(expect.objectContaining({ id: 1 }));
  });

  it('should delete organization', async () => {
    repo.deleteOrganization.mockResolvedValue(true);
    const result = await service.deleteOrganization(1);
    expect(repo.deleteOrganization).toHaveBeenCalledWith(1);
    expect(result).toBe(true);
  });
});
