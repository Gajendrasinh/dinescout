import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '../errors/error-codes';

interface RequestWithId extends Request {
  requestId?: string;
}

/**
 * Renders every thrown error into the standard `{ error: { code, message } }`
 * envelope. Never leaks a stack trace or internal detail to the client;
 * unexpected errors are logged server-side with the request's correlation
 * id and returned to the client as a generic 500.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const requestId = request.requestId ?? 'unknown';

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const { code, message, details } = this.normalize(body, status);

      if (status >= 500) {
        this.logger.error(`[${requestId}] ${exception.message}`, exception.stack);
      }

      response.status(status).json({
        error: { code, message, ...(details ? { details } : {}) },
      });
      return;
    }

    const err = exception instanceof Error ? exception : new Error('Unknown error');
    this.logger.error(`[${requestId}] Unhandled exception: ${err.message}`, err.stack);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'An unexpected error occurred. Please try again.',
      },
    });
  }

  private normalize(
    body: unknown,
    status: number,
  ): { code: string; message: string; details?: Record<string, unknown> } {
    // ApiException already provides { code, message, details }.
    if (typeof body === 'object' && body !== null && 'code' in body && 'message' in body) {
      const b = body as { code: string; message: string; details?: Record<string, unknown> };
      return { code: b.code, message: b.message, details: b.details };
    }

    // Nest's built-in HttpException / ValidationPipe shape: { message, error, statusCode }
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const b = body as { message: string | string[]; error?: string };
      const message = Array.isArray(b.message) ? b.message.join('; ') : b.message;
      return {
        code: this.codeForStatus(status),
        message,
        details: Array.isArray(b.message) ? { fields: b.message } : undefined,
      };
    }

    return { code: this.codeForStatus(status), message: String(body) };
  }

  private codeForStatus(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_FAILED;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMITED;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }
}
