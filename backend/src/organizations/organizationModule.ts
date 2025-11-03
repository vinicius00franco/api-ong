import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OrganizationController } from './organizationController';
import { OrganizationService } from './organizationService';
import { OrganizationRepository } from './organizationRepository';
import { AuthGuard } from '../middleware/authMiddleware';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [OrganizationController],
  providers: [OrganizationService, OrganizationRepository, AuthGuard],
  exports: [OrganizationService],
})
export class OrganizationModule {}
