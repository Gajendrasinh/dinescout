# Testing

Every number below is from an actual run in this repo, not a claim — see
`docs/DEPLOYMENT.md` and the git history for exactly which commit each
figure came from.

## Backend — `apps/api`

**Unit tests** (Jest, mocked collaborators): `npm run test --workspace apps/api`
— **26 tests, 5 suites**: `common/utils/geo.spec.ts`,
`reviews/providers/{profanity-filter,spam-detector}.provider.spec.ts`,
`ai/tools/tool-router.service.spec.ts` (including a rejected-disallowed-
tool-call case and a simulated tool failure), and
`config/env.validation.spec.ts` (JWT secret strength/uniqueness/
placeholder-in-production rules — added during the hardening pass).

**Integration/e2e tests** (Jest + Supertest, real HTTP requests against a
real PostgreSQL + Redis): `npm run test:e2e --workspace apps/api` —
**50 tests, 9 suites**: `auth`, `restaurants`, `menu`, `reviews`,
`favorites`, `ai`, `admin`, `health`, `validation`. Runs against
`dinescout_test`, reset via `test/jest-e2e.global-setup.ts` (truncate +
re-seed lookup tables once before any worker starts, avoiding a real race
where parallel Jest workers independently upsert the same cuisine rows).
`AI_PROVIDER=none` is forced for these runs (`test/jest-e2e.setup.ts`) so
they're deterministic and never call a real LLM vendor.

## Frontend — `apps/mobile`, `apps/admin`

Karma + Jasmine, `ChromeHeadlessCI` (a custom launcher in each app's
`karma.conf.js` with `--no-sandbox` for running as root in a container).
`npm run test --workspace apps/mobile` (18 tests) and
`npm run test --workspace apps/admin` (6 tests) — component specs
covering the shared UI primitives (chip toggling, star rating, restaurant
card) and app-specific logic.

## Critical-flow E2E — `e2e/` (Playwright)

The real mobile web app, driven by a real browser, against the real API
and a real seeded database — nothing mocked. `npm run test:e2e:critical-flows`:

1. **`search-and-browse.spec.ts`** — search a real restaurant by name,
   open it, view its menu, read its reviews.
2. **`favorites.spec.ts`** — log in, favorite a restaurant, see it under
   the Favorites tab.
3. **`write-review.spec.ts`** — sign up, post a review, see it in that
   restaurant's review list. Registers a fresh account per run rather than
   reusing a seeded diner, specifically because every seeded diner already
   has 30+ seeded reviews and the API correctly rejects a second review
   from the same user for the same restaurant (`409` — a real business
   rule, documented in `e2e/README.md`).
4. **`ai-recommendation.spec.ts`** — ask DineScout AI for a vegetarian
   recommendation, then open the restaurant it suggests and confirm the
   details page resolves to a real restaurant with the same name — the
   concrete proof that a recommendation traces back to a real DB row.

**A real bug this suite caught**: `apps/mobile/src/app/app.config.ts`'s
`provideAppInitializer` called `inject(FavoritesService)` *after* an
`await`, which is invalid outside Angular's injection context (`NG0203`)
— the mobile web app crashed to a blank page on every single load. Unit
tests and the production build both passed regardless, because neither
actually renders the app in a browser. Fixed by capturing both injected
services before the first `await`; see `e2e/README.md` and the commit
that added this suite for the full story. This is exactly the class of
bug E2E testing exists to catch, and it did.

`e2e/tests/helpers/click.ts` documents two more genuine framework
interactions found while writing these specs (Stencil shadow-DOM hit-
testing defeating Playwright's pointer-event check, and `ion-activatable`
swallowing synthesized mouse events) and how the suite works around them —
worth reading if you're extending this suite.

## Running everything locally

```bash
# Backend unit + integration
npm run test --workspace apps/api
TEST_DATABASE_URL=postgresql://dinescout:dinescout@localhost:5432/dinescout_test?schema=public \
  npm run test:e2e --workspace apps/api

# Frontend unit (point CHROME_BIN at any Chromium if none is installed system-wide)
CHROME_BIN=/path/to/chrome npm run test --workspace apps/mobile
CHROME_BIN=/path/to/chrome npm run test --workspace apps/admin

# Critical-flow E2E — starts real dev servers for you (see e2e/playwright.config.ts)
npm run prisma:seed --workspace apps/api
PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome npm run test:e2e:critical-flows
```

## CI

`.github/workflows/ci.yml` runs all of the above, in this order, on every
PR and push to `main`: lint → unit tests (api + mobile + admin) → api e2e
(real Postgres/Redis service containers) → production build → **e2e
critical-flows** (migrate + seed + Playwright against real dev servers) →
docker build (all three images, matrix, not pushed). See
`docs/DEPLOYMENT.md`.
