# Architecture

## System overview

```
┌─────────────┐     ┌─────────────┐
│  Mobile app │     │  Admin app  │        Ionic 9 + Angular 19 (mobile)
│ (Ionic/Ang) │     │ (Angular19) │        Angular 19 (admin, no Ionic)
└──────┬──────┘     └──────┬──────┘        Both: standalone components,
       │  HTTPS/JSON       │  HTTPS/JSON   signals, strict TS
       └─────────┬─────────┘
                  ▼
          ┌───────────────┐
          │   NestJS API   │  /api/v1/*  — REST, JWT auth, Swagger at /api/docs
          │  (apps/api)    │
          └───┬───────┬────┘
              │        │
     ┌────────▼──┐  ┌──▼─────┐
     │ PostgreSQL │  │ Redis  │   Prisma ORM · rate-limit counters,
     │ (Prisma)   │  │        │   refresh-token families, response cache
     └────────────┘  └────────┘
              ▲
              │ tool-router (whitelisted DB reads only)
     ┌────────┴────────┐
     │   AiService      │  AiProvider interface:
     │ (apps/api/src/ai)│   AnthropicAiProvider (real, needs AI_API_KEY)
     └──────────────────┘   LocalHeuristicAiProvider (zero-key fallback)
```

## Monorepo strategy

Plain **npm workspaces** — no Nx/Turborepo. `packages/shared-types` is
built once (`tsc`) and consumed by `apps/api`, `apps/mobile`, and
`apps/admin` as `@dinescout/shared-types`, so a DTO or enum only has one
definition anywhere in the codebase. `packages/tsconfig` and
`packages/eslint-config` do the same for compiler options and lint rules —
every workspace extends the same base rather than re-declaring it.

## Backend (`apps/api`)

NestJS 11, feature-modules by domain:

- `auth` — register/login/refresh/logout/password-reset. Argon2id
  hashing, JWT access + refresh tokens, refresh-token **rotation with
  family-based reuse detection** (`RefreshToken.family` in the schema —
  reusing an already-rotated token revokes the whole family, the standard
  defense against a stolen refresh token being replayed after the
  legitimate client has already rotated past it).
- `restaurants`, `menu`, `reviews`, `favorites`, `cuisines` — the core
  discovery domain. `RestaurantsService.findOne()` filters
  `status: PUBLISHED` — a draft/unpublished restaurant is only reachable
  through the `admin` module, never the public API (see SECURITY.md).
- `admin` — a second, admin-only slice of restaurant/menu/review/user
  management, gated by `RolesGuard` (`ADMIN`/`MODERATOR`), separate from
  the public controllers so a public-facing bug can't accidentally expose
  admin actions.
- `ai` — see `docs/AI.md`. The tool router is the *only* thing the AI
  provider can call; it never gets a database handle.
- `health` — liveness/readiness probes, unversioned (`/health/live`,
  `/health/ready`), excluded from the global `/api` prefix and from the
  response envelope so orchestrators (ECS, k8s, Docker healthchecks) get a
  plain JSON body, not the app's `{ data, meta }` wrapper.
- `config` — `env.validation.ts` fails the process at boot (not at first
  request) if required env vars are missing, malformed, or — for JWT
  secrets specifically — too weak or still the checked-in placeholder in
  production. See `docs/SECURITY.md`.

### Guard ordering

Global guards run in this order (`apps/api/src/app.module.ts`):
`OptionalAuthGuard` → `ThrottlerGuard` → `RolesGuard`. `OptionalAuthGuard`
must populate `request.user` (when a valid token is present) *before*
`RolesGuard` runs, because `RolesGuard` also runs standalone on
`@UseGuards(OptionalAuthGuard, RequireAuthGuard, RolesGuard)`-decorated
admin routes and needs to tell "no user at all" (401) apart from "user
present, wrong role" (403) — getting that order wrong silently turns every
403 into a 401 or vice versa.

### Response envelope

Every success response is `{ data, meta }`; every error is
`{ error: { code, message } }` (see `apps/api/src/common/interceptors` and
`common/filters`). Health endpoints are the one deliberate exception —
they return Terminus's own shape unwrapped, for tooling compatibility.

## Frontend (`apps/mobile`, `apps/admin`)

- Standalone components throughout — no `NgModule`s.
- Angular Signals for local component state; RxJS for HTTP/async streams.
- `@if`/`@for` control-flow syntax (Angular's new template syntax, not
  `*ngIf`/`*ngFor`).
- `provideAppInitializer` blocks the router's first navigation until an
  async auth bootstrap (`AuthService.bootstrap()`, and for mobile also
  `FavoritesService.bootstrap()`) resolves — without this, a hard reload or
  deep link straight into a guarded route races the guard's synchronous
  check against that async call and wrongly redirects to `/login`. (A real
  bug of exactly this shape — calling `inject()` after crossing an `await`,
  invalid outside Angular's injection context — was caught by the E2E
  suite and fixed; see `docs/TESTING.md`.)
- `apps/mobile` additionally wraps Capacitor plugins (Preferences,
  Geolocation, Camera, Share, Haptics, Network, App, PushNotifications,
  Browser) behind its own `core/services/*` — the rest of the app depends
  on those services, never on `@capacitor/*` directly, so the web fallback
  and native implementations are swapped in one place.

## Provider abstractions

Two integrations are built as swappable interfaces specifically so the app
runs with zero paid credentials and upgrades cleanly when they're added:

- **`AiProvider`** (`apps/api/src/ai/providers/`) — `AnthropicAiProvider`
  (real, `@anthropic-ai/sdk`) vs. `LocalHeuristicAiProvider` (deterministic,
  zero-credential, marks its responses `degraded: true`). Selected by a
  factory in `ai.module.ts` based on whether `AI_API_KEY` is set.
- **`MapProvider`** (mobile) — a real Google Maps implementation vs. a
  static/list fallback when `MAP_API_KEY` is unset.

Neither key is ever sent to the frontend; both are read server-side/build-
time only (see `docs/SECURITY.md`).

## Admin app

A separate Angular 19 app (no Ionic — it's a desktop-oriented console, not
a mobile experience): dashboard, restaurant CRUD + publish/unpublish,
menu category/item CRUD, review moderation queue + report resolution, and
a read-only user list. Talks to the same API's `admin/*` routes, under the
same JWT auth but requiring `ADMIN`/`MODERATOR` role.
