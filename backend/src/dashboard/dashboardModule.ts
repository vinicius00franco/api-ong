import { Module } from '@nestjs/common';
import { DashboardController } from './dashboardController';
import { DashboardService } from './dashboardService';
import { pool } from '../lib/database';
import { AuthModule } from '../auth/authModule';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    {
      provide: 'DB',
      useValue: pool,
    },
  ],
})
export class DashboardModule {}