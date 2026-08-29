# Security

## Authentication & session management

- **Argon2id** password hashing (`apps/api/src/auth/auth.service.ts`),
  cost params from env (`ARGON2_MEMORY_COST`/`ARGON2_TIME_COST`), lighter
  in tests for speed.
- **JWT access + refresh tokens**, separate secrets. `env.validation.ts`
  enforces (fails boot, not first request):
  - `@MinLength(32)` on both `JWT_SECRET` and `JWT_REFRESH_SECRET`.
  - The two secrets must differ (reusing one means a leaked access-token
    secret also forges refresh tokens).
  - Neither may equal the placeholder value checked into `.env.example`
    when `NODE_ENV=production` — this repo is public, so deploying with
    that literal string would mean every JWT is forgeable by anyone who's
    read the source.
  - Covered by `apps/api/src/config/env.validation.spec.ts`.
- **Refresh-token rotation with family-based reuse detection**
  (`RefreshToken.family` in the schema) — presenting an already-rotated-out
  token revokes the entire family, the standard mitigation for a stolen
  refresh token being replayed after the legitimate client rotated past it.
- No JWT secret ever has an insecure default — `AppConfigService` uses
  `getOrThrow`, so a missing secret is a boot failure, never a silent
  fallback to something guessable.

## Authorization

- `RolesGuard` (global + per-route on `admin/*` controllers) throws
  **401 if there's no authenticated user at all**, and only checks
  role membership (403 on mismatch) once a user is confirmed present —
  getting this ordering wrong (checking role before presence) was a real
  bug caught and fixed during the build, verified by an e2e test asserting
  the exact status code.
- Guard execution order is deliberate: `OptionalAuthGuard` →
  `ThrottlerGuard` → `RolesGuard` globally, so `request.user` is always
  populated (if a valid token was sent) before `RolesGuard` runs.
- **Draft/unpublished restaurants are invisible to the public API.**
  `RestaurantsService.findOne()` filters `status: PUBLISHED` in addition
  to the soft-delete check — this was a real bug (a draft was reachable
  by ID) found and fixed during the build; see `docs/DATABASE.md`.
- Admin write actions are role-gated per-route (`@Roles(ADMIN)` or
  `@Roles(ADMIN, MODERATOR)`), not just behind "any admin token".

## Input handling

- Every request body goes through a global `ValidationPipe({ whitelist:
  true, forbidNonWhitelisted: true, transform: true })` — an unexpected
  field is rejected outright, not silently dropped (which would otherwise
  let a client smuggle fields past what a DTO documents).
- Prisma parameterizes every query; there is no raw-SQL path reachable
  from user input anywhere in the app (the only raw SQL in the repo is a
  `TRUNCATE` in the e2e test harness's DB reset, not application code).
- Angular's default interpolation (`{{ }}`) auto-escapes — review titles/
  comments/display names render as text, never as HTML, so a review body
  containing `<script>` displays literally rather than executing.
- Review moderation: `profanity-filter.provider.ts` and
  `spam-detector.provider.ts` run before a review is publicly visible
  (`ReviewStatus` starts `PENDING`), plus an admin moderation queue and
  user-reportable flow (`ReviewReport`) for anything that slips through.

## Transport & headers

- `helmet()` applied globally (`apps/api/src/bootstrap.ts`); CSP enabled
  in production, relaxed in dev so Swagger UI still works.
- CORS restricted to `CORS_ORIGINS` from env — never a wildcard; requests
  from an unlisted origin are rejected.
- Per-endpoint rate limits on top of the global throttler: login 5/min,
  register 10/min (`@Throttle` on `auth.controller.ts`) — brute-force
  resistance beyond the app-wide default.
- nginx configs for the mobile-web/admin static images add
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
  `Referrer-Policy: no-referrer-when-downgrade`.

## Secrets

- `.env` is gitignored (`.env.example` is the only committed template);
  `apps/api/.env` is separately gitignored too.
- `AI_API_KEY`/`MAP_API_KEY` are read server-side only and never appear in
  any API response or frontend bundle — both features degrade to a
  zero-credential fallback provider when unset, rather than the app
  refusing to run (see `docs/AI.md`).
- Terraform (`infrastructure/terraform/`) reads app secrets from AWS
  Secrets Manager by ARN — it never generates or stores a secret value
  itself, and the DB master password is generated with `random_password`
  and stored in Secrets Manager, not passed as a plain `tfvars` value.
- A repo-wide scan for common secret-key patterns (`sk-ant-…`,
  `AIza…`, `AKIA…`) turned up nothing committed.

## Known gaps — stated plainly, not hidden

- **`npm audit`**: the pinned Angular 19 / Ionic 9 / Capacitor 8 toolchain
  has known high-severity advisories in `@angular/core`/`@angular/compiler`
  (XSS-related) and several dev-only build tools (vite, webpack-dev-server,
  uuid via `xcode`/`@capacitor/cli`, `deepmerge-ts` via Prisma's CLI). Every
  one of these requires `npm audit fix --force`, which would jump Angular
  to 21 — a breaking change that risks the pinned Ionic 9 compatibility
  this entire mobile app is built against. `npm audit fix` (non-breaking)
  was run and made no changes (verified via `git diff --stat
  package-lock.json`). This is a real, present risk to track and address
  deliberately (upgrade Angular *and* verify Ionic 9's compatibility
  together, on a branch, with the full test suite as the gate) rather than
  something to force through mid-build.
- **No WAF/CloudFront** in front of the Terraform-provisioned ALB yet
  (noted in `infrastructure/terraform/README.md`).
- **No automated dependency-update bot** (Dependabot/Renovate) configured.
- **Password-reset email delivery defaults to console logging.**
  `forgot-password`/`reset-password` use the same provider-interface
  pattern as `AiProvider`/`MapProvider` (`EmailProvider`,
  `apps/api/src/auth/providers/email.provider.ts`), but the only
  implementation wired up is `ConsoleEmailProvider` — it logs the reset
  link server-side instead of sending a real email. The flow (token
  generation, `PasswordResetToken` expiry, "always return success whether
  or not the email exists" to avoid user enumeration) is real and tested;
  a real SMTP/SES-backed `EmailProvider` implementation would need to be
  added before this is usable end-to-end in production.
