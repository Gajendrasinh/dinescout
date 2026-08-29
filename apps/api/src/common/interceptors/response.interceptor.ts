import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface EnvelopedData<T> {
  data: T;
  meta?: Record<string, unknown>;
}

function isPreEnveloped<T>(value: unknown): value is EnvelopedData<T> {
  return typeof value === 'object' && value !== null && 'data' in value;
}

/**
 * Wraps every successful controller response in the standard
 * `{ data, meta }` envelope. A handler may return `{ data, meta }`
 * itself (e.g. paginated list endpoints) — that shape passes through
 * unchanged instead of being double-wrapped.
 *
 * Health endpoints are excluded: they sit outside the versioned /api
 * surface (infra probes, not app API responses) and orchestrators/Terminus
 * tooling expect the standard `{ status, info, error, details }` shape
 * unwrapped.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, EnvelopedData<T> | T> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<EnvelopedData<T> | T> {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.path === '/health' || request.path.startsWith('/health/')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((payload) => {
        if (isPreEnveloped<T>(payload)) {
          return payload;
        }
        return { data: payload };
      }),
    );
  }
}
