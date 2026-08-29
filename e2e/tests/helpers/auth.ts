import { Page, expect } from '@playwright/test';
import { click } from './click';

// Seeded by apps/api/prisma/seed/index.ts — a real diner account, not a
// mock. Password matches DEMO_PASSWORD for every seeded user.
export const DINER_EMAIL = 'diner01@dinescout.app';
export const DINER_PASSWORD = 'Password123!';

/** Drives the real login form (not a token injection) so the auth flow itself stays covered. */
export async function loginAsDiner(page: Page): Promise<void> {
  await page.goto('/auth/login');
  await page.locator('ion-input[formcontrolname="email"] input').fill(DINER_EMAIL);
  await page.locator('ion-input[formcontrolname="password"] input').fill(DINER_PASSWORD);
  await click(page.getByRole('button', { name: /log in/i }));
  // Successful login redirects away from /auth/login back into the tab shell.
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10_000 });
}

/**
 * Registers a brand-new diner account through the real signup form and
 * returns its credentials. Used instead of the shared seeded diner where a
 * test needs a user guaranteed to have no prior history (e.g. writing a
 * review — the seeded diners already have 500+ seeded reviews between them,
 * so reviewing a restaurant they've already reviewed would hit the API's
 * real one-review-per-user-per-restaurant conflict, not a test bug).
 */
export async function registerNewDiner(
  page: Page,
): Promise<{ email: string; password: string }> {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@dinescout.app`;
  const password = 'E2eTest123!';

  await page.goto('/auth/register');
  await page.locator('ion-input[formcontrolname="displayName"] input').fill('E2E Test Diner');
  await page.locator('ion-input[formcontrolname="email"] input').fill(email);
  await page.locator('ion-input[formcontrolname="password"] input').fill(password);
  await click(page.getByRole('button', { name: /sign up/i }));
  await expect(page).toHaveURL(/\/tabs\/home/, { timeout: 10_000 });

  return { email, password };
}
