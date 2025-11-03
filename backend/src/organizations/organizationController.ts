import { Body, Controller, Delete, Param, Patch, Post, UseGuards, UsePipes, ForbiddenException, Req } from '@nestjs/common';
import { ZodValidationPipe } from '../lib/zodValidationPipe';
import { HandleErrors } from '../lib/handleErrors';
import { ApiResponse } from '../lib/apiResponse';
import { AuthGuard } from '../middleware/authMiddleware';
import { OrganizationService } from './organizationService';
import { createOrganizationSchema, updateOrganizationSchema, CreateOrganizationInput, UpdateOrganizationInput } from './organizationSchemas';

@Controller('organizations')
export class OrganizationController {
  constructor(private service: OrganizationService) {}

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
}
