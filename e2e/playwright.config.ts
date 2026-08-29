import { defineConfig, devices } from '@playwright/test';

// Critical-flow E2E specs, driven against the REAL mobile web app talking
// to the REAL API and a REAL PostgreSQL/Redis-backed database (seeded via
// `npm run prisma:seed --workspace apps/api`) — no mocked network layer.
//
// `webServer` starts both the api and the mobile dev servers if they
// aren't already running (reuseExistingServer: true locally, so a server
// you already have open is left alone; CI always starts fresh). Point
// PLAYWRIGHT_CHROMIUM_PATH at a Chromium binary when no system browser is
// installed (see README.md's "Running these specs" section).
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // shared seeded DB — specs create/read state, so run serially
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: process.env.MOBILE_BASE_URL ?? 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH, args: ['--no-sandbox'] }
          : undefined,
      },
    },
  ],

  webServer: [
    {
      command: 'npm run start:dev --workspace apps/api',
      cwd: '..',
      url: 'http://localhost:3000/health/ready',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npm run start --workspace apps/mobile -- --port 4200',
      cwd: '..',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
