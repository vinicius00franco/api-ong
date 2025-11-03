import { Controller, Post, Body, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from '../lib/zodValidationPipe';
import { AuthService } from './authService';
import { loginSchema, LoginInput, registerSchema, RegisterInput } from './authSchemas';
import { LoginResponse } from './authTypes';
import { HandleErrors } from '../lib/handleErrors';
import { ApiResponse } from '../lib/apiResponse';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UsePipes(new ZodValidationPipe(loginSchema))
  @HandleErrors()
  async login(
    @Body() loginInput: LoginInput,
  ): Promise<ApiResponse<LoginResponse>> {
    const result = await this.authService.login(loginInput);
    return ApiResponse.success(result);
  }

  @Post('register')
  @UsePipes(new ZodValidationPipe(registerSchema))
  @HandleErrors()
  async register(
    @Body() registerInput: RegisterInput,
  ): Promise<ApiResponse<{ id: number; name: string; email: string }>> {
    const result = await this.authService.register(registerInput);
    return ApiResponse.success(result);
  }
}