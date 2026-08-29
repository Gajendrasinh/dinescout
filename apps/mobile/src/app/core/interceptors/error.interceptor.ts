import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

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

/**
 * Normalizes every failed request into a plain `AppError` (`{ code,
 * message, status }`) so feature components never need to know the HTTP
 * error shape. Server errors are logged (without request bodies/tokens);
 * expected 4xx errors (validation, not-found, etc.) are not, to keep
 * production logs signal-heavy.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const appError: AppError = isApiErrorBody(error.error)
        ? { code: error.error.error.code, message: error.error.error.message, status: error.status }
        : {
            code: error.status === 0 ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR',
            message:
              error.status === 0
                ? "Couldn't reach DineScout. Check your connection and try again."
                : 'Something went wrong. Please try again.',
            status: error.status,
          };

      if (appError.status >= 500 || appError.status === 0) {
        console.error(`[API] ${req.method} ${req.url} -> ${appError.code}: ${appError.message}`);
      }

      return throwError(() => appError);
    }),
  );
