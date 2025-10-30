import { Controller, Post, Body, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from '../lib/zodValidationPipe'; // Vou criar isso
import { AuthService } from './authService';
import { loginSchema, LoginInput } from './authSchemas';
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
}