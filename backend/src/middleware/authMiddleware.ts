import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JWTPayload } from '../auth/authTypes';
import { getDb } from '../lib/dbContext';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid token');
    }

    const token = authHeader.substring(7);

    try {
      const payload: JWTPayload = this.jwtService.verify(token);
      // Get organization ID from UUID
      const orgQuery = 'SELECT id FROM organizations WHERE uuid = $1';
      const orgResult = await getDb().query(orgQuery, [payload.organizationId]);
      if (!orgResult.rows[0]) {
        throw new UnauthorizedException('Invalid organization');
      }
      request.organizationId = orgResult.rows[0].id;
      // Also expose the UUID for responses/logging when needed
      request.organizationUuid = payload.organizationId;
      request.userId = payload.sub;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}