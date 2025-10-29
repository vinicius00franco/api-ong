import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../auth/authService';
import { AuthRepository } from '../../auth/authRepository';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: jest.Mocked<AuthRepository>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const mockAuthRepository = {
      findOrganizationByEmail: jest.fn(),
    };
    const mockJwtService = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: mockAuthRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    authRepository = module.get(AuthRepository);
    jwtService = module.get(JwtService);
  });

  it('should return access token for valid credentials', async () => {
    const loginRequest = { email: 'test@example.com', password: 'password123' };
    const organization = { id: 'org1', password_hash: await bcrypt.hash('password123', 10) };
    const token = 'jwt-token';

    authRepository.findOrganizationByEmail.mockResolvedValue(organization);
    jwtService.sign.mockReturnValue(token);

    const result = await service.login(loginRequest);

    expect(result).toEqual({ access_token: token, organization_id: 'org1' });
    expect(authRepository.findOrganizationByEmail).toHaveBeenCalledWith('test@example.com');
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 'org1',
      email: 'test@example.com',
      organization_id: 'org1',
    });
  });

  it('should throw UnauthorizedException for invalid email', async () => {
    const loginRequest = { email: 'invalid@example.com', password: 'password123' };

    authRepository.findOrganizationByEmail.mockResolvedValue(null);

    await expect(service.login(loginRequest)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException for invalid password', async () => {
    const loginRequest = { email: 'test@example.com', password: 'wrongpassword' };
    const organization = { id: 'org1', password_hash: await bcrypt.hash('password123', 10) };

    authRepository.findOrganizationByEmail.mockResolvedValue(organization);

    await expect(service.login(loginRequest)).rejects.toThrow(UnauthorizedException);
  });
});