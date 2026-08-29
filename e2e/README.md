# DineScout critical-flow E2E suite

Playwright specs that drive the **real** mobile web app against the **real**
API and a real seeded PostgreSQL/Redis-backed database — nothing here is
mocked. Covers the flows IMPLEMENTATION_PLAN.md calls out as critical:

- `search-and-browse.spec.ts` — search a restaurant, open it, view its menu, read its reviews.
- `favorites.spec.ts` — log in, favorite a restaurant, see it under Favorites.
- `write-review.spec.ts` — sign up, write a review, see it in the restaurant's review list.
- `ai-recommendation.spec.ts` — ask DineScout AI for a recommendation and open the real restaurant it suggests.

## Running these specs

```bash
# 1. Postgres/Redis reachable, and the api's .env pointed at them (see apps/api/.env.example)
# 2. Seed data present:
npm run prisma:migrate --workspace apps/api
npm run prisma:seed --workspace apps/api

# 3. Run the suite — playwright.config.ts starts the api and mobile dev
#    servers for you if they aren't already running (reuseExistingServer
#    locally; always fresh in CI).
npm run test:e2e:critical-flows
```

If no system Chrome/Chromium is installed, point `PLAYWRIGHT_CHROMIUM_PATH`
at one (a Playwright-managed binary works fine) before running — the same
pattern `apps/mobile/karma.conf.js` and `apps/admin/karma.conf.js` use for
`CHROME_BIN`:

```bash
PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome npm run test:e2e:critical-flows --workspace e2e
```

## Why some clicks use `tests/helpers/click.ts` instead of Playwright's `.click()`

Every routed mobile page renders inside a Stencil shadow-DOM
`<ion-router-outlet>`. That breaks Playwright's plain `.click()` in two
different ways discovered while writing this suite (both are genuine
framework interactions, not flakiness to paper over):

1. Playwright's pre-click "receives pointer events" hit-test reports the
   outlet's shadow **host** as the target for a point that's visually inside
   a descendant, due to how shadow-DOM event retargeting works — so
   `.click()` times out waiting for an element that, on screen, is not
   obstructed at all.
2. `ion-activatable` elements (`ion-card[button]`, `ion-button`, ...) run
   their own internal gesture/ripple handling that swallows Playwright's
   synthesized mousedown+mouseup+click sequence, even with `{ force: true }`
   — but the exact same coordinates respond fine to an actual user's click.

`click()` in `tests/helpers/click.ts` calls the target's real
`HTMLElement.click()` via `locator.evaluate()`, which runs the browser's
native per-element activation behavior (critical for `<ion-button
type="submit">` triggering its enclosing `<form>`'s real submit) the same
way a genuine click would, without fighting either issue above.

## Why `write-review.spec.ts` registers a new account instead of using the shared seeded diner

`apps/api/prisma/seed/index.ts` seeds 552 reviews across 15 diner accounts —
each seeded diner already has 30+ reviews. The reviews API correctly rejects
a second review from the same user for the same restaurant (`409`, a real
business rule, not a bug), so writing this spec against `diner01@dinescout.app`
would conflict unpredictably depending on which restaurant `search`'s first
result happens to be. `helpers/auth.ts`'s `registerNewDiner()` signs up a
fresh account through the real registration form instead, sidestepping that
entirely while still exercising a real signup flow.
