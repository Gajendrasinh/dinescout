import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { ApiException } from '../../common/errors/api.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../types/authenticated-user';

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

/**
 * Used with `@Roles(...)` on admin/moderator-only endpoints. Registered
 * both globally (APP_GUARD, so it runs before any per-controller
 * RequireAuthGuard) and locally on admin controllers — so it must itself
 * distinguish "not authenticated at all" (401) from "authenticated but not
 * permitted" (403) rather than assuming RequireAuthGuard already ran.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user) {
      throw ApiException.unauthorized(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }
    if (!requiredRoles.includes(user.role)) {
      throw ApiException.forbidden(ErrorCode.FORBIDDEN, 'Insufficient permissions');
    }
    return true;
  }
}
