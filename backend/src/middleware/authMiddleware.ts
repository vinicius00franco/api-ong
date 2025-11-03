import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JWTPayload } from '../auth/authTypes';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid token');
    }

    const token = authHeader.substring(7);

    try {
      const payload: JWTPayload = this.jwtService.verify(token);
      request.organizationId = payload.organizationId;
      request.userId = payload.sub;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}