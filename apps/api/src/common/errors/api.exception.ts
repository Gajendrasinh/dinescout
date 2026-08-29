import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes';

/**
 * Domain exception carrying a stable error code + user-safe message.
 * Thrown from services/controllers; rendered into the standard
 * `{ error: { code, message } }` envelope by AllExceptionsFilter.
 */
export class ApiException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, status);
  }

  static notFound(code: ErrorCode, message: string): ApiException {
    return new ApiException(code, message, HttpStatus.NOT_FOUND);
  }

  static conflict(code: ErrorCode, message: string): ApiException {
    return new ApiException(code, message, HttpStatus.CONFLICT);
  }

  static forbidden(code: ErrorCode, message: string): ApiException {
    return new ApiException(code, message, HttpStatus.FORBIDDEN);
  }

  static unauthorized(code: ErrorCode, message: string): ApiException {
    return new ApiException(code, message, HttpStatus.UNAUTHORIZED);
  }

  static tooManyRequests(code: ErrorCode, message: string): ApiException {
    return new ApiException(code, message, HttpStatus.TOO_MANY_REQUESTS);
  }
}
