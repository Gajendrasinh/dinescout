import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { ApiException } from '../../common/errors/api.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { AuthenticatedUser } from '../types/authenticated-user';

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

/** Rejects the request unless OptionalAuthGuard already attached a user. */
@Injectable()
export class RequireAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user) {
      throw ApiException.unauthorized(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }
    return true;
  }
}
