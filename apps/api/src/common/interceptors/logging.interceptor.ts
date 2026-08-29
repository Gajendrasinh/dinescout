import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

interface RequestWithId extends Request {
  requestId?: string;
}

/**
 * Structured request/response logging with latency and correlation id.
 * Never logs request bodies, headers, tokens, or passwords — only route
 * shape, status, and timing, which is what API-latency observability
 * needs without capturing PII.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.log(request, response.statusCode, start),
        error: (err: Error & { status?: number }) =>
          this.log(request, err.status ?? 500, start),
      }),
    );
  }

  private log(request: RequestWithId, status: number, start: number): void {
    const durationMs = Date.now() - start;
    this.logger.log(
      JSON.stringify({
        requestId: request.requestId,
        method: request.method,
        path: request.route?.path ?? request.path,
        status,
        durationMs,
      }),
    );
  }
}
