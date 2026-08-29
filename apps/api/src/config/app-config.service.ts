import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Thin typed wrapper around ConfigService so the rest of the app never
 * reads `process.env` or untyped config keys directly.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get nodeEnv(): string {
    return this.config.getOrThrow<string>('NODE_ENV');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.config.getOrThrow<number>('PORT');
  }

  get apiPrefix(): string {
    return this.config.getOrThrow<string>('API_PREFIX');
  }

  get corsOrigins(): string[] {
    const raw = this.config.get<string>('CORS_ORIGINS', '');
    return raw
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  get databaseUrl(): string {
    return this.config.getOrThrow<string>('DATABASE_URL');
  }

  get redisUrl(): string {
    return this.config.getOrThrow<string>('REDIS_URL');
  }

  get jwtSecret(): string {
    return this.config.getOrThrow<string>('JWT_SECRET');
  }

  get jwtExpiresIn(): string {
    return this.config.getOrThrow<string>('JWT_EXPIRES_IN');
  }

  get jwtRefreshSecret(): string {
    return this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  get jwtRefreshExpiresIn(): string {
    return this.config.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN');
  }

  get argon2Options(): { memoryCost: number; timeCost: number } {
    return {
      memoryCost: this.config.getOrThrow<number>('ARGON2_MEMORY_COST'),
      timeCost: this.config.getOrThrow<number>('ARGON2_TIME_COST'),
    };
  }

  get aiProvider(): 'anthropic' | 'none' {
    return this.config.getOrThrow('AI_PROVIDER');
  }

  get aiApiKey(): string | undefined {
    return this.config.get<string>('AI_API_KEY') || undefined;
  }

  get aiModel(): string {
    return this.config.getOrThrow<string>('AI_MODEL');
  }

  get aiMaxOutputTokens(): number {
    return this.config.getOrThrow<number>('AI_MAX_OUTPUT_TOKENS');
  }

  get aiRequestTimeoutMs(): number {
    return this.config.getOrThrow<number>('AI_REQUEST_TIMEOUT_MS');
  }

  get mapProvider(): 'google' | 'none' {
    return this.config.getOrThrow('MAP_PROVIDER');
  }

  get mapApiKey(): string | undefined {
    return this.config.get<string>('MAP_API_KEY') || undefined;
  }

  get rateLimit(): { ttlSeconds: number; max: number } {
    return {
      ttlSeconds: this.config.getOrThrow<number>('RATE_LIMIT_TTL_SECONDS'),
      max: this.config.getOrThrow<number>('RATE_LIMIT_MAX'),
    };
  }
}
