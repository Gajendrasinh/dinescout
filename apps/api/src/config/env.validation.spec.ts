import 'reflect-metadata'; // class-transformer's @Type() decorator needs this at import time
import { validateEnv } from './env.validation';

// A minimal, otherwise-valid config to mutate per test — keeps each test
// focused on the one field it's checking instead of repeating the full env.
function validConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    ...overrides,
  };
}

describe('validateEnv', () => {
  it('accepts a valid configuration', () => {
    expect(() => validateEnv(validConfig())).not.toThrow();
  });

  it('rejects a JWT_SECRET shorter than 32 characters', () => {
    expect(() => validateEnv(validConfig({ JWT_SECRET: 'too-short' }))).toThrow(
      /Invalid environment configuration/,
    );
  });

  it('rejects a JWT_REFRESH_SECRET shorter than 32 characters', () => {
    expect(() => validateEnv(validConfig({ JWT_REFRESH_SECRET: 'too-short' }))).toThrow(
      /Invalid environment configuration/,
    );
  });

  it('rejects JWT_SECRET and JWT_REFRESH_SECRET being the same value', () => {
    const sameSecret = 'c'.repeat(32);
    expect(() =>
      validateEnv(validConfig({ JWT_SECRET: sameSecret, JWT_REFRESH_SECRET: sameSecret })),
    ).toThrow(/must be different/);
  });

  it('rejects the checked-in placeholder JWT secrets in production', () => {
    expect(() =>
      validateEnv(
        validConfig({
          NODE_ENV: 'production',
          JWT_SECRET: 'dev-only-jwt-secret-change-me-please-1234567890',
        }),
      ),
    ).toThrow(/placeholder value/);
  });

  it('allows the placeholder JWT secrets outside production', () => {
    expect(() =>
      validateEnv(
        validConfig({
          NODE_ENV: 'development',
          JWT_SECRET: 'dev-only-jwt-secret-change-me-please-1234567890',
          JWT_REFRESH_SECRET: 'dev-only-refresh-secret-change-me-0987654321',
        }),
      ),
    ).not.toThrow();
  });

  it('rejects a missing DATABASE_URL', () => {
    const config = validConfig();
    delete config.DATABASE_URL;
    expect(() => validateEnv(config)).toThrow(/Invalid environment configuration/);
  });
});
