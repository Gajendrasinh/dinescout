import { Type, plainToInstance } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength, validateSync } from 'class-validator';

// Placeholder secrets that ship in .env.example / apps/api/.env for local
// dev. Booting in production with one of these would mean every JWT this
// server issues is forgeable by anyone who has read this public repo, so
// validateEnv() below refuses to start rather than silently accepting them.
const KNOWN_DEV_SECRETS = new Set([
  'dev-only-jwt-secret-change-me-please-1234567890',
  'dev-only-refresh-secret-change-me-0987654321',
]);

class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV = 'development';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @IsString()
  API_PREFIX = 'api';

  @IsString()
  CORS_ORIGINS = '';

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  REDIS_URL!: string;

  // 32 chars is a floor, not a target — `openssl rand -base64 48` (see
  // .env.example) comfortably clears it. Too short to brute-force is not
  // the same as strong, but it does catch "secret123"-style placeholders
  // at boot instead of in a pentest.
  @IsString()
  @MinLength(32)
  JWT_SECRET!: string;

  @IsString()
  JWT_EXPIRES_IN = '15m';

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET!: string;

  @IsString()
  JWT_REFRESH_EXPIRES_IN = '30d';

  @Type(() => Number)
  @IsInt()
  ARGON2_MEMORY_COST = 19456;

  @Type(() => Number)
  @IsInt()
  ARGON2_TIME_COST = 2;

  @IsIn(['anthropic', 'none'])
  AI_PROVIDER = 'anthropic';

  @IsOptional()
  @IsString()
  AI_API_KEY?: string;

  @IsString()
  AI_MODEL = 'claude-sonnet-5';

  @Type(() => Number)
  @IsInt()
  AI_MAX_OUTPUT_TOKENS = 1024;

  @Type(() => Number)
  @IsInt()
  AI_REQUEST_TIMEOUT_MS = 15000;

  @IsIn(['google', 'none'])
  MAP_PROVIDER = 'google';

  @IsOptional()
  @IsString()
  MAP_API_KEY?: string;

  // Outbound email (password reset). Unset SMTP_HOST -> ConsoleEmailProvider
  // (logs instead of sending, see apps/api/src/auth/providers/email.provider.ts)
  // -> the app runs with zero email vendor credentials, same fallback
  // pattern as AI_API_KEY/MAP_API_KEY above. Any real SMTP-speaking vendor
  // works here (Amazon SES, SendGrid, Mailgun, Postmark, ...) — nothing
  // vendor-specific is assumed.
  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  @Type(() => Number)
  @IsInt()
  SMTP_PORT = 587;

  @IsIn(['true', 'false'])
  SMTP_SECURE = 'false';

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASSWORD?: string;

  @IsString()
  EMAIL_FROM = 'DineScout <no-reply@dinescout.app>';

  @Type(() => Number)
  @IsInt()
  RATE_LIMIT_TTL_SECONDS = 60;

  @Type(() => Number)
  @IsInt()
  RATE_LIMIT_MAX = 120;
}

/**
 * Fails fast at boot if required environment variables are missing or
 * malformed, instead of surfacing confusing errors deep in a request path.
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${messages}`);
  }

  // Cross-field checks that class-validator's per-property decorators can't
  // express on their own.
  if (validated.JWT_SECRET === validated.JWT_REFRESH_SECRET) {
    throw new Error(
      'Invalid environment configuration: JWT_SECRET and JWT_REFRESH_SECRET must be different ' +
        '— reusing one secret for both means a leaked access token secret also forges refresh tokens.',
    );
  }
  if (validated.NODE_ENV === 'production') {
    if (KNOWN_DEV_SECRETS.has(validated.JWT_SECRET) || KNOWN_DEV_SECRETS.has(validated.JWT_REFRESH_SECRET)) {
      throw new Error(
        'Invalid environment configuration: JWT_SECRET/JWT_REFRESH_SECRET is still the placeholder ' +
          'value from .env.example — generate real secrets (e.g. `openssl rand -base64 48`) before ' +
          'deploying to production.',
      );
    }
  }
  if (Boolean(validated.SMTP_USER) !== Boolean(validated.SMTP_PASSWORD)) {
    throw new Error(
      'Invalid environment configuration: SMTP_USER and SMTP_PASSWORD must be set together ' +
        '(or both left unset for an unauthenticated relay) — one without the other is almost ' +
        'always a copy-paste mistake, not an intentional configuration.',
    );
  }

  return validated;
}
