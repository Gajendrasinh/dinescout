# DineScout

**Discover. Compare. Taste.**

DineScout is an AI-powered restaurant *discovery* platform — not a food
delivery app. It helps people find, compare, and decide where to eat: a
mobile app (Ionic + Angular, deployable to iOS/Android/Web from one
codebase), an admin console for restaurant/review moderation, a NestJS +
PostgreSQL API, and an AI assistant that recommends real restaurants from
the real database — it never invents facts.

## Monorepo layout

```
apps/
  mobile/    Ionic 9 + Angular 19 + Capacitor 8 — the diner-facing app (iOS/Android/Web)
  admin/     Ionic-free Angular 19 admin console (restaurants, menu, reviews, users)
  api/       NestJS 11 + Prisma 6 + PostgreSQL 16 + Redis — REST API under /api/v1
packages/
  shared-types/    TypeScript types/enums/DTOs shared by every app (single source of truth)
  eslint-config/   Shared ESLint flat config
  tsconfig/        Shared base tsconfig
e2e/         Playwright critical-flow specs, run against real dev servers + real DB
infrastructure/
  docker/    Per-app Dockerfiles + docker-compose.yml for local full-stack dev
  terraform/ AWS deployment skeleton (VPC/RDS/ElastiCache/ECS/ECR) — see its README
docs/        ARCHITECTURE, API, DATABASE, AI, SECURITY, TESTING, DEPLOYMENT
```

## Quickstart

```bash
npm install
cp .env.example .env          # fill in JWT secrets: openssl rand -base64 48

# Postgres + Redis: either
docker compose up -d postgres redis
# ...or point DATABASE_URL/REDIS_URL in .env at ones you already have running.

npm run prisma:migrate --workspace apps/api
npm run prisma:seed --workspace apps/api     # 50 restaurants, 346 menu items, 552 reviews

npm run dev:api        # http://localhost:3000 — Swagger at /api/docs
npm run dev:mobile      # http://localhost:4200 (ng serve default)
npm run dev:admin -- --port 4201    # both apps default to 4200 — pick a different port to run them together
```

Seeded logins (all `Password123!`): `admin@dinescout.app` (ADMIN),
`moderator@dinescout.app` (MODERATOR), `diner01@dinescout.app`…`diner15@dinescout.app` (USER).

## Commands

| Command | What it does |
|---|---|
| `npm run lint` | ESLint across every workspace |
| `npm run build` | Production build of shared-types, api, mobile, admin |
| `npm run test` | Unit tests across every workspace (Jest for api, Karma/Jasmine for mobile/admin) |
| `npm run test:e2e` | API integration tests (Jest + Supertest against a real Postgres/Redis) |
| `npm run test:e2e:critical-flows` | Playwright specs against the real mobile app + API (see `e2e/README.md`) |

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design, module boundaries, key patterns
- [`docs/API.md`](docs/API.md) — full REST surface
- [`docs/DATABASE.md`](docs/DATABASE.md) — schema, indexes, migrations
- [`docs/AI.md`](docs/AI.md) — the tool-router architecture and why the AI can't hallucinate facts
- [`docs/SECURITY.md`](docs/SECURITY.md) — auth, secrets, what was hardened, known gaps
- [`docs/TESTING.md`](docs/TESTING.md) — what's tested, how, and how to run it
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Docker, CI/CD, Terraform, what's verified vs. documented
- [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) — what this sandbox could and couldn't verify, kept current through the build

## License

Unlicensed — internal/assessment project, not published to a registry.
