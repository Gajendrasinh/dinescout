import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export interface AppError {
  code: string;
  message: string;
  status: number;
}

function isApiErrorBody(body: unknown): body is { error: { code: string; message: string } } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as { error?: unknown }).error === 'object'
  );
}

/** Normalizes failures into `AppError` and bounces to /login on a 401 —
 *  an admin session that's expired or was never valid shouldn't leave the
 *  user staring at a broken dashboard. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      if (error.status === 401) {
        auth.logout();
        void router.navigate(['/login']);
      }

      const appError: AppError = isApiErrorBody(error.error)
        ? { code: error.error.error.code, message: error.error.error.message, status: error.status }
        : {
            code: error.status === 0 ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR',
            message:
              error.status === 0
                ? "Couldn't reach the DineScout API. Check your connection and try again."
                : 'Something went wrong. Please try again.',
            status: error.status,
          };

      if (appError.status >= 500 || appError.status === 0) {
        console.error(`[API] ${req.method} ${req.url} -> ${appError.code}: ${appError.message}`);
      }

      return throwError(() => appError);
    }),
  );
};
