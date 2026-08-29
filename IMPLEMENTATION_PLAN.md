# DineScout — Implementation Plan

## 0. Context

`gajendrasinh/dinescout` was created empty for this build (the original
`falling-bricks-java` repo is an unrelated, already-complete Java assessment
and was left untouched). This plan governs a from-scratch monorepo.

The full source prompt asks for a multi-platform (iOS/Android/Web),
AI-integrated, production-deployed restaurant discovery platform with a
mobile app, admin app, full test pyramid, CI/CD and cloud infrastructure.
That is genuinely weeks of work for a team. This plan states, up front,
what will be **real and verified** in this session versus what will be
**scaffolded/documented** because it requires resources this sandbox does
not have (Xcode/Android SDK, cloud credentials, a paid LLM/AI key, a paid
Maps key, a live Docker daemon). Nothing will be reported as done, tested,
or deployed unless it actually was.

Environment facts checked before planning:
- Node 22.22, npm 10.9 available.
- Docker CLI present but **no Docker daemon** in this sandbox → Dockerfiles
  and `docker-compose.yml` will be written and validated for syntax/config
  correctness, but `docker compose up` itself cannot be executed here. This
  is called out explicitly rather than claimed as verified.
- PostgreSQL 16 and Redis are installed **locally** (not via Docker) → used
  to actually run migrations, seed data, the API, and integration tests
  against a real database and cache, so the backend is genuinely exercised
  even without Docker.
- No Xcode / Android SDK → Capacitor config, native project generation
  commands, and deep-link manifests are provided and documented, not built
  or run.
- No AI provider key / no Maps provider key by default → both are built as
  first-class provider interfaces (`AiProvider`, `MapProvider`) with a real
  Anthropic-backed implementation plus a local fallback implementation that
  runs with zero credentials so the rest of the app keeps working. Whoever
  deploys this sets `AI_API_KEY` / `MAP_API_KEY` to light up the real
  providers.

## 1. Scope decisions

- **Monorepo**: npm workspaces (no Nx/Turborepo — keeps it inspectable and
  avoids an extra build-system dependency for a repo this size).
- **apps/api**: NestJS + TypeScript + Prisma + PostgreSQL + Redis + JWT
  (Argon2 password hashing, refresh-token rotation) + Swagger at
  `/api/docs`, versioned routes under `/api/v1`.
- **apps/mobile**: Ionic 9 + Angular (standalone components, signals,
  lazy-loaded feature routes) + Capacitor scaffolding for iOS/Android. Runs
  as a real web app in this sandbox (`ionic serve` / Angular dev server);
  native shells are configured but not compiled.
- **apps/admin**: Angular admin console (restaurant + review moderation,
  users, reports) talking to the same API. Kept intentionally lean per the
  "basic admin application" requirement — not a second full product.
- **packages/shared-types**: DTOs/interfaces shared by api, mobile, admin.
- **packages/eslint-config, packages/tsconfig**: shared lint/TS config.
- **infrastructure/docker**: per-app Dockerfiles.
- **infrastructure/terraform**: minimal ECS/Fargate + RDS + ElastiCache
  skeleton — infrastructure-as-code that documents the target shape,
  explicitly not applied (no cloud credentials in this session).
- **AI**: tool-router architecture — the LLM never touches Postgres
  directly; it calls whitelisted server-side tools
  (`searchRestaurants`, `findNearbyRestaurants`, `getRestaurant`, `getMenu`,
  `searchDishes`, `getReviews`, `getOpeningHours`, `getUserPreferences`)
  that hit the real database. `AiProvider` interface has an
  `AnthropicAiProvider` (used when `AI_API_KEY` is set) and a
  `LocalHeuristicAiProvider` fallback (deterministic, tool-data-only,
  clearly labeled) used otherwise — the tools and data are always real,
  only the natural-language generation degrades without a key.
- **Map**: `MapProvider` interface, `GoogleMapsProvider` implementation
  (needs `MAP_API_KEY`) and a `StaticMapProvider` fallback that still
  renders a restaurant list + coordinates without an external SDK.

## 2. Build order

1. Monorepo skeleton, shared packages, root tooling (ESLint/Prettier/TS
   project refs), env files.
2. **Backend** — Prisma schema for the full data model, migrations, seed
   script (Singapore demo data), auth, restaurants/search/filters, menu,
   reviews (full lifecycle + moderation-ready design), favorites, AI
   chat + tools, health, Swagger. Run it against local Postgres/Redis.
   Jest + Supertest tests, run for real, failures fixed.
3. **Frontend (mobile)** — core/shared/features structure; Home, Search,
   Filters, Restaurant Details, Menu, Reviews, Favorites, Map, AI Chat,
   Auth, Profile; wired to the real API (no mock data in the app's runtime
   paths). Component tests run for real.
4. **Admin** — restaurant CRUD + publish/unpublish, review moderation
   queue, users, reports; wired to the real API.
5. **Mobile shell** — Capacitor config, deep-link manifests, native
   feature abstractions (geolocation/camera/share/haptics/push),
   documented (not compiled) iOS/Android commands.
6. **Infra** — Dockerfiles, docker-compose.yml, Terraform skeleton, GitHub
   Actions CI (lint/test/build/docker build) and a documented CD workflow.
7. **E2E** — Playwright config + critical-flow specs, run against the real
   API + built web app where the sandbox allows it.
8. **Hardening pass** — security/perf/accessibility review against what
   was actually built, lint, build, fix.
9. **Docs** — README, ARCHITECTURE, API, DATABASE, AI, SECURITY, TESTING,
   DEPLOYMENT, plus this plan kept current.

## 3. What will explicitly NOT be claimed as done

- No live deployment (no cloud account attached to this session).
- No compiled iOS/Android binaries (no native SDKs here).
- No real third-party AI/Maps calls unless the user supplies working keys
  in their own environment — the code paths are real and provider-agnostic,
  the vendor calls are not exercised in this sandbox.
- `docker compose up` is not executed here (no daemon); Dockerfiles/compose
  are reviewed for correctness instead of a live run.

Progress and any scope changes will be reflected back into this file as the
build proceeds.
