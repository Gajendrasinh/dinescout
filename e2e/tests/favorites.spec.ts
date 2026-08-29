import { test, expect } from '@playwright/test';
import { loginAsDiner } from './helpers/auth';
import { click } from './helpers/click';
import { currentPage } from './helpers/page';

// Critical flow: log in -> favorite a restaurant from its details page ->
// confirm it shows up in the Favorites tab, backed by the real favorites
// API (apps/api/src/favorites) and a real Postgres row, not local state.
test('favorite a restaurant and see it under Favorites', async ({ page }) => {
  await loginAsDiner(page);

  await page.goto('/tabs/search');
  const firstCard = page.locator('app-restaurant-card .ds-card').first();
  await expect(firstCard).toBeVisible({ timeout: 15_000 });
  const restaurantName = (await firstCard.locator('.ds-card__name').textContent())?.trim();
  expect(restaurantName).toBeTruthy();

  await click(firstCard);
  await expect(page).toHaveURL(/\/restaurants\/[^/]+$/);
  const details = currentPage(page);
  await expect(details.locator('h1.ds-details-name')).toHaveText(restaurantName!);

  const favButton = details.locator('.ds-hero__fav');
  // Start from a known state in case a previous run left this favorited.
  if ((await favButton.getAttribute('aria-pressed')) === 'true') {
    await click(favButton);
    await expect(favButton).toHaveAttribute('aria-pressed', 'false');
  }

  await click(favButton);
  await expect(favButton).toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 });

  await page.goto('/tabs/favorites');
  const favoritesList = currentPage(page);
  await expect(
    favoritesList.locator('app-restaurant-card .ds-card__name', { hasText: restaurantName! }),
  ).toBeVisible({ timeout: 15_000 });
});
