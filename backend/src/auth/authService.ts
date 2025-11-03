import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from './authRepository';
import { LoginRequest, LoginResponse, JWTPayload } from './authTypes';

@Injectable()
export class AuthService {
  constructor(
    private authRepository: AuthRepository,
    private jwtService: JwtService,
  ) {}

  async login(loginRequest: LoginRequest): Promise<LoginResponse> {
    const organization = await this.authRepository.findOrganizationByEmail(loginRequest.email);
    if (!organization) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginRequest.password, organization.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JWTPayload = {
      sub: organization.id,
      email: loginRequest.email,
      organizationId: organization.id,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      organizationId: organization.id,
    };
  }

  async register(registerData: { name: string; email: string; password: string }): Promise<{ id: number; name: string; email: string }> {
    // Check if organization already exists
    const existingOrg = await this.authRepository.findOrganizationByEmail(registerData.email);
    if (existingOrg) {
      throw new UnauthorizedException('Organization already exists with this email');
    }

    return await this.authRepository.createOrganization(
      registerData.name,
      registerData.email,
      registerData.password
    );
  }

  async createUser(createUserData: { name: string; email: string; password: string; role?: 'user' | 'admin' }, organizationId: number): Promise<{ id: number; name: string; email: string; role: string; organizationId: number }> {
    // Check if user already exists
    const existingUser = await this.authRepository.findUserByEmail(createUserData.email);
    if (existingUser) {
      throw new ConflictException('User already exists with this email');
    }

    const user = await this.authRepository.createUser({
      name: createUserData.name,
      email: createUserData.email,
      password: createUserData.password,
      role: createUserData.role || 'user',
      organizationId,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };
  }
}