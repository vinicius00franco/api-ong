import { Module } from '@nestjs/common';
import { OrganizationController } from './organizationController';
import { OrganizationService } from './organizationService';
import { OrganizationRepository } from './organizationRepository';
import { AuthGuard } from '../middleware/authMiddleware';
import { AuthModule } from '../auth/authModule';

@Module({
  imports: [AuthModule],
  controllers: [OrganizationController],
  providers: [OrganizationService, OrganizationRepository, AuthGuard],
  exports: [OrganizationService],
})
export class OrganizationModule {}
