import { Type, plainToInstance } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min, validateSync } from 'class-validator';

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

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  JWT_EXPIRES_IN = '15m';

  @IsString()
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

  return validated;
}
