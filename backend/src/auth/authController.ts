import { Controller, Post, Body, UsePipes, UseGuards, Request } from '@nestjs/common';
import { ZodValidationPipe } from '../lib/zodValidationPipe';
import { AuthService } from './authService';
import { loginSchema, LoginInput, registerSchema, RegisterInput, createUserSchema, CreateUserInput } from './authSchemas';
import { LoginResponse } from './authTypes';
import { HandleErrors } from '../lib/handleErrors';
import { ApiResponse } from '../lib/apiResponse';
import { AuthGuard } from '../middleware/authMiddleware';

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

  @Post('users')
  @UseGuards(AuthGuard)
  @UsePipes(new ZodValidationPipe(createUserSchema))
  @HandleErrors()
  async createUser(
    @Body() createUserInput: CreateUserInput,
    @Request() req: any,
  ): Promise<ApiResponse<{ id: number; name: string; email: string; role: string; organizationId: number }>> {
    const result = await this.authService.createUser(createUserInput, req.organizationId);
    return ApiResponse.success(result);
  }
}