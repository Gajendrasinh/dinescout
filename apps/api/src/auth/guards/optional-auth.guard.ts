import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedUser } from '../types/authenticated-user';

/**
 * Applied globally. Populates `request.user` when a valid Bearer token is
 * present but never rejects the request otherwise — most of DineScout
 * (browsing, search, menus, reviews) must work for anonymous users.
 * Routes that require a logged-in user layer `RequireAuthGuard` on top.
 */
@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context) as Promise<boolean>;
  }

  handleRequest<TUser = AuthenticatedUser>(
    _err: unknown,
    user: TUser | false,
  ): TUser | undefined {
    // Swallow auth errors — an invalid/missing token just means "anonymous".
    return user ? user : undefined;
  }
}
