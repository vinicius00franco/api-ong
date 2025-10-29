import { Controller, Post, Body, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from '../lib/zodValidationPipe'; // Vou criar isso
import { AuthService } from './authService';
import { loginSchema, LoginInput } from './authSchemas';
import { LoginResponse } from './authTypes';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(@Body() loginInput: LoginInput): Promise<LoginResponse> {
    return this.authService.login(loginInput);
  }
}