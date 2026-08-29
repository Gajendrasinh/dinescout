import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, firstValueFrom, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../services/token-storage.service';

interface RefreshResponse {
  data: { tokens: { accessToken: string; refreshToken: string } };
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(
  http: HttpClient,
  tokens: TokenStorageService,
): Promise<string | null> {
  const refreshToken = await tokens.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await firstValueFrom(
      http.post<RefreshResponse>(`${environment.apiBaseUrl}/auth/refresh`, { refreshToken }),
    );
    await tokens.setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
    return res.data.tokens.accessToken;
  } catch {
    await tokens.clear();
    return null;
  }
}

/**
 * Attaches the bearer access token to every API request and, on a 401,
 * refreshes the token pair exactly once (concurrent 401s share the same
 * in-flight refresh) before retrying the original request.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenStorageService);
  const http = inject(HttpClient);

  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  const accessToken = tokens.getAccessTokenSync();
  const authedReq = accessToken
    ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
    : req;

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;
      const isAuthEndpoint = req.url.includes('/auth/');
      if (!isUnauthorized || isAuthEndpoint) {
        return throwError(() => error);
      }

      refreshInFlight ??= refreshAccessToken(http, tokens).finally(() => {
        refreshInFlight = null;
      });

      return from(refreshInFlight).pipe(
        switchMap((newAccessToken) => {
          if (!newAccessToken) {
            return throwError(() => error);
          }
          const retried = req.clone({
            setHeaders: { Authorization: `Bearer ${newAccessToken}` },
          });
          return next(retried);
        }),
      );
    }),
  );
};
