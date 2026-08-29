import { test, expect } from '@playwright/test';
import { registerNewDiner } from './helpers/auth';
import { click } from './helpers/click';
import { currentPage } from './helpers/page';

// Critical flow: sign up -> write a real review for a restaurant -> confirm
// it's persisted and shows up in that restaurant's review list, via the
// real reviews API (apps/api/src/reviews), including its moderation
// pipeline (profanity/spam checks) rather than a mocked submit. Uses a
// freshly-registered account rather than a seeded diner because the seed
// data already gives every seeded diner 30+ reviews, and the API correctly
// rejects a second review from the same user for the same restaurant
// (409) — a real business rule that a fresh account sidesteps cleanly.
test('write a review and see it appear in the review list', async ({ page }) => {
  await registerNewDiner(page);

  await page.goto('/tabs/search');
  const firstCard = page.locator('app-restaurant-card .ds-card').first();
  await expect(firstCard).toBeVisible({ timeout: 15_000 });
  await click(firstCard);
  await expect(page).toHaveURL(/\/restaurants\/([^/]+)$/);
  const restaurantId = page.url().match(/\/restaurants\/([^/]+)$/)![1];

  await page.goto(`/restaurants/${restaurantId}/reviews/new`);
  const form = currentPage(page);
  await expect(form.locator('h1')).toHaveText('Write a Review');

  await click(form.getByRole('radio', { name: '5 stars' }));

  // Both must be unique per run (not just the title) — otherwise a repeat
  // run of this spec against the same seeded restaurant leaves a prior
  // run's review with identical text still in the list, and the assertion
  // below matches two paragraphs instead of one.
  const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const title = `E2E review ${runId}`;
  const comment = `Written by the DineScout critical-flow E2E suite — real API, real DB row (${runId}).`;
  await form.locator('#review-title input').fill(title);
  await form.locator('#review-comment textarea').fill(comment);

  await click(form.getByRole('button', { name: /post review/i }));

  // Successful submit navigates back to the reviews list for this restaurant.
  await expect(page).toHaveURL(new RegExp(`/restaurants/${restaurantId}/reviews$`), {
    timeout: 10_000,
  });
  const reviewsPage = currentPage(page);
  await expect(reviewsPage.getByText(title)).toBeVisible({ timeout: 15_000 });
  await expect(reviewsPage.getByText(comment)).toBeVisible();
});
