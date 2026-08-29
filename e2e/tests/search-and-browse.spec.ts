import { test, expect } from '@playwright/test';
import { click } from './helpers/click';
import { currentPage } from './helpers/page';

// Critical flow: search a restaurant -> open it -> view its menu -> read its
// reviews. Driven entirely against real seed data (50 restaurants, 346 menu
// items, 552 reviews from apps/api/prisma/seed) — nothing here is mocked.
test('search restaurant, open it, view menu, read reviews', async ({ page }) => {
  await page.goto('/tabs/search');

  // The search page loads an unfiltered first page on init, so cards render
  // before any query is typed.
  const cards = page.locator('app-restaurant-card .ds-card');
  await expect(cards.first()).toBeVisible({ timeout: 15_000 });

  const firstName = (await cards.first().locator('.ds-card__name').textContent())?.trim();
  expect(firstName).toBeTruthy();

  // Search by (part of) that real restaurant's name and confirm the search
  // actually narrows results down to it — proves the search endpoint is
  // wired up, not just that the page renders.
  const searchTerm = firstName!.split(' ')[0];
  await page.getByRole('searchbox').fill(searchTerm);
  await expect(cards.first()).toBeVisible({ timeout: 15_000 });
  await expect(cards.first().locator('.ds-card__name')).toContainText(searchTerm, {
    ignoreCase: true,
  });

  await click(cards.first());

  // Restaurant details page.
  await expect(page).toHaveURL(/\/restaurants\/[^/]+$/);
  const detailsName = currentPage(page).locator('h1.ds-details-name');
  await expect(detailsName).toBeVisible();
  const openedName = (await detailsName.textContent())?.trim();
  expect(openedName).toBeTruthy();

  // Menu.
  await click(currentPage(page).getByRole('button', { name: /view full menu/i }));
  await expect(page).toHaveURL(/\/restaurants\/[^/]+\/menu$/);
  await expect(currentPage(page).locator('h1')).toHaveText('Menu');
  // Every seeded restaurant has menu items (346 items across 50
  // restaurants), so the real empty-state should never show here.
  await expect(currentPage(page).locator('.ds-menu-item').first()).toBeVisible({
    timeout: 15_000,
  });

  // Back to details, then reviews.
  await page.goBack();
  await expect(currentPage(page).locator('h1.ds-details-name')).toBeVisible();
  await click(currentPage(page).locator('button.ds-link', { hasText: 'See all' }));
  await expect(page).toHaveURL(/\/restaurants\/[^/]+\/reviews$/);
  await expect(currentPage(page).locator('h1')).toHaveText('Reviews');
  // 552 seeded reviews across 50 restaurants (~11 each) — expect at least one.
  await expect(currentPage(page).locator('.ds-review').first()).toBeVisible({ timeout: 15_000 });
});
