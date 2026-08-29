// Runs before each e2e test file's module graph is imported. Values set
// here win over anything in .env because @nestjs/config's dotenv loader
// does not overwrite variables already present in process.env.
process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT ?? '3100';
process.env.API_PREFIX = 'api';
process.env.CORS_ORIGINS = 'http://localhost:8100';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://dinescout:dinescout@localhost:5432/dinescout_test?schema=public';
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret-not-for-production-use-only';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-not-for-production-use-only';
process.env.JWT_REFRESH_EXPIRES_IN = '30d';
process.env.ARGON2_MEMORY_COST = '4096'; // lighter than prod default, keeps tests fast
process.env.ARGON2_TIME_COST = '2';
// Force the local heuristic AI provider so e2e tests are deterministic and
// never make a real network call to an LLM vendor.
process.env.AI_PROVIDER = 'none';
process.env.AI_MODEL = 'claude-sonnet-5';
process.env.AI_MAX_OUTPUT_TOKENS = '512';
process.env.AI_REQUEST_TIMEOUT_MS = '5000';
process.env.MAP_PROVIDER = 'none';
process.env.RATE_LIMIT_TTL_SECONDS = '60';
process.env.RATE_LIMIT_MAX = '1000';
