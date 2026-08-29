import { Locator } from '@playwright/test';

/**
 * Every routed page in the mobile app is projected through a Stencil
 * shadow-DOM `<ion-router-outlet>` (see apps/mobile/src/app/app.component.html
 * and tabs.page.html), which makes Playwright's point-based "receives
 * pointer events" pre-check report the outlet's shadow *host* as the hit
 * target instead of the actual descendant — so plain `.click()` times out.
 * `ion-activatable` elements (ion-card[button], ion-button, ...) compound
 * this: their internal gesture/ripple handling swallows Playwright's
 * synthesized mousedown+mouseup+click sequence even with `force: true`,
 * even though the exact same coordinates respond fine to a real user's
 * click. `dispatchEvent('click', ...)` sidesteps both issues by firing the
 * `HTMLElement.click()` directly (via `evaluate`, since Playwright has no
 * built-in wrapper for it) rather than dispatching a bare event — Angular's
 * `(click)` bindings don't check `isTrusted` either way, but `.click()`
 * additionally runs the browser's real per-element "activation behavior",
 * which matters for `<ion-button type="submit">`: only that native
 * activation path reliably triggers the enclosing `<form>`'s submit, the
 * same way a user's click would.
 */
export async function click(locator: Locator): Promise<void> {
  await locator.evaluate((el) => (el as HTMLElement).click());
}
