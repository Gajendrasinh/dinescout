import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Blocks a route unless the user is logged in, redirecting to login with
 *  a returnUrl so they land back where they intended after signing in. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;

  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};
