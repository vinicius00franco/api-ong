import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '../middleware/authMiddleware';
import { HandleErrors } from '../lib/handleErrors';
import { ApiResponse } from '../lib/apiResponse';
import { DashboardService } from './dashboardService';
import { DashboardStats, ActivityItem } from './dashboardTypes';

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @HandleErrors()
  async getDashboard(@Request() req: any): Promise<ApiResponse<DashboardStats>> {
    const data = await this.dashboardService.getStats(req.organizationId);
    return ApiResponse.success(data);
  }

  @Get('stats')
  @HandleErrors()
  async stats(@Request() req: any): Promise<ApiResponse<DashboardStats>> {
    const data = await this.dashboardService.getStats(req.organizationId);
    return ApiResponse.success(data);
  }

  @Get('activities')
  @HandleErrors()
  async activities(@Request() req: any): Promise<ApiResponse<ActivityItem[]>> {
    const data = await this.dashboardService.getRecentActivities(req.organizationId);
    return ApiResponse.success(data);
  }
}