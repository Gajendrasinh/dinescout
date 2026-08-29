import { Page } from '@playwright/test';

/**
 * Ionic's <ion-router-outlet> keeps previously-visited pages mounted in the
 * DOM (hidden via the `ion-page-hidden` class, not removed) so back
 * navigation can transition instantly. That means after a few pushes,
 * several pages' `<h1>`s/buttons/etc. legitimately coexist in the DOM at
 * once. Scope queries to the one page that's actually on screen instead of
 * matching across all of them.
 */
export function currentPage(page: Page) {
  return page.locator('.ion-page:not(.ion-page-hidden)').last();
}
