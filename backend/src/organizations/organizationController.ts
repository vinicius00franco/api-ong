import { Body, Controller, Delete, Param, Patch, Post, UseGuards, UsePipes, ForbiddenException, Req, BadRequestException } from '@nestjs/common';
import { ZodValidationPipe } from '../lib/zodValidationPipe';
import { HandleErrors } from '../lib/handleErrors';
import { ApiResponse } from '../lib/apiResponse';
import { AuthGuard } from '../middleware/authMiddleware';
import { OrganizationService } from './organizationService';
import { createOrganizationSchema, updateOrganizationSchema, CreateOrganizationInput, UpdateOrganizationInput } from './organizationSchemas';
import { AuthService } from '../auth/authService';
import { createUserSchema, CreateUserInput } from '../auth/authSchemas';

@Controller('organizations')
export class OrganizationController {
  constructor(private service: OrganizationService, private authService: AuthService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createOrganizationSchema))
  @HandleErrors()
  async create(@Body() body: CreateOrganizationInput): Promise<ApiResponse> {
    const org = await this.service.createOrganizationWithOptionalAdmin(body);
    return ApiResponse.success(org);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @HandleErrors()
  async update(@Param('id') id: string, @Body() updates: UpdateOrganizationInput, @Req() req: any): Promise<ApiResponse> {
    // Only allow a token from the same organization to update itself
    const numericId = Number(id);
  const requestOrgId = req?.organizationId;
    if (requestOrgId !== numericId) {
      throw new ForbiddenException('Operation not permitted for this organization');
    }
    const org = await this.service.updateOrganization(numericId, updates);
    return ApiResponse.success(org);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @HandleErrors()
  async remove(@Param('id') id: string, @Req() req: any): Promise<ApiResponse> {
    const numericId = Number(id);
    const requestOrgId = req?.organizationId;
    if (requestOrgId !== numericId) {
      throw new ForbiddenException('Operation not permitted for this organization');
    }
    await this.service.deleteOrganization(numericId);
    return ApiResponse.success({ deleted: true });
  }

  @Post(':id/users')
  @UseGuards(AuthGuard)
  @HandleErrors()
  async createUser(@Param('id') id: string, @Body() body: CreateUserInput, @Req() req: any): Promise<ApiResponse> {
    const numericId = Number(id);
    const requestOrgId = req?.organizationId;
    if (requestOrgId !== numericId) {
      throw new ForbiddenException('Operation not permitted for this organization');
    }

    // If body arrives as string (some test harnesses), try to parse it.
    let payload: any = body as any;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        throw new BadRequestException([{ code: 'invalid_json', message: 'Invalid JSON body' }]);
      }
    }

    // Validate with Zod schema manually so we control error shape
    const parsed = createUserSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors);
    }

    const result = await this.authService.createUser(parsed.data, numericId);
    return ApiResponse.success(result);
  }
}
