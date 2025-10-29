import { Injectable, UnauthorizedException } from '@nestjs/common';
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

    const isPasswordValid = await bcrypt.compare(loginRequest.password, organization.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JWTPayload = {
      sub: organization.id,
      email: loginRequest.email,
      organization_id: organization.id,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      organization_id: organization.id,
    };
  }
}