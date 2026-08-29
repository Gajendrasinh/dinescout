# API Reference

Base URL: `http://localhost:3000/api/v1` (dev) — `API_PREFIX=api` +
URI versioning (`defaultVersion: '1'`) combine to produce the `/api/v1`
prefix. Interactive Swagger/OpenAPI docs: **`/api/docs`**.

Health endpoints are the one exception — unversioned and unprefixed:
`GET /health`, `GET /health/live`, `GET /health/ready`.

## Conventions

- **Auth**: `Authorization: Bearer <accessToken>`. Get one from
  `POST /auth/login` or `/auth/register`.
- **Success envelope**: `{ "data": ..., "meta": {...} }` (list endpoints
  add `meta.total`/`meta.page`/`meta.totalPages` for pagination).
- **Error envelope**: `{ "error": { "code": "...", "message": "..." } }`.
- **Pagination**: `?page=1&limit=20` on list endpoints.
- **Validation**: every body is checked against a DTO with
  `whitelist: true, forbidNonWhitelisted: true` — an unexpected field is a
  `400`, not silently dropped or accepted.

## Auth — `/auth`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | — | `@Throttle` 10/min |
| POST | `/auth/login` | — | `@Throttle` 5/min |
| POST | `/auth/refresh` | refresh token | Rotates the token; reusing a rotated-out token revokes its whole family |
| POST | `/auth/logout` | access token | Revokes the current refresh-token family |
| POST | `/auth/forgot-password` | — | |
| POST | `/auth/reset-password` | — | |

## Restaurants, menu, reviews, favorites (public + authenticated diner routes)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/restaurants` | optional | Search/filter/paginate. `search`, `cuisine`, `dietary`, `priceRange`, `lat`/`lng`/`radius`, `page`, `limit` |
| GET | `/restaurants/:id` | optional | Published restaurants only — a draft 404s here even for its owner (use `/admin/restaurants/:id`) |
| GET | `/restaurants/:restaurantId/menu` | optional | Categories + items |
| GET | `/restaurants/:restaurantId/menu/categories` | optional | |
| GET | `/menu-items/:id` | optional | |
| GET | `/restaurants/:restaurantId/reviews` | optional | Sort: `most_relevant`\|`newest`\|`highest_rated`\|`lowest_rated` |
| GET | `/restaurants/:restaurantId/reviews/summary` | optional | Rating breakdown |
| POST | `/restaurants/:restaurantId/reviews` | required | One review per user per restaurant — a second attempt is `409` |
| PATCH | `/reviews/:id` | required (author) | |
| DELETE | `/reviews/:id` | required (author) | |
| POST | `/reviews/:id/report` | required | Feeds the admin moderation queue |
| GET | `/favorites` | required | |
| POST | `/favorites/:restaurantId` | required | |
| DELETE | `/favorites/:restaurantId` | required | |
| GET | `/cuisines` | — | |
| GET | `/dietary-options` | — | |
| GET | `/users/me` | required | |
| GET | `/users/me/preferences` | required | |
| PATCH | `/users/me/preferences` | required | |

## AI — `/ai`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/ai/chat` | optional | See `docs/AI.md` — the only network-facing entry point to the assistant |
| GET | `/ai/conversations` | required | |
| GET | `/ai/conversations/:id` | required | |
| GET | `/restaurants/:restaurantId/ai-summary` | optional | AI-generated review summary, built only from that restaurant's real reviews |

## Admin — `/admin/*` (requires `ADMIN` or `MODERATOR` role; some write actions are `ADMIN`-only)

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/dashboard` | Aggregate stats |
| GET \| POST \| PATCH \| DELETE | `/admin/restaurants[/:id]` | Full CRUD, including DRAFT restaurants |
| PATCH | `/admin/restaurants/:id/publish` \| `/unpublish` | |
| POST \| PATCH \| DELETE | `/admin/restaurants/:restaurantId/menu/categories[/:categoryId]` | |
| POST \| PATCH \| DELETE | `/admin/restaurants/:restaurantId/menu/items[/:itemId]` | |
| GET | `/admin/reviews` | Moderation queue, filter by `status` |
| PATCH | `/admin/reviews/:id/status` | Approve/reject/hide |
| GET | `/admin/reviews/reports` | User-submitted reports |
| PATCH | `/admin/reviews/reports/:id` | Resolve a report |
| GET | `/admin/users` | Read-only list |

## Health

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Terminus full check (DB + Redis) |
| GET | `/health/live` | Liveness — process is up |
| GET | `/health/ready` | Readiness — DB/Redis reachable |

Full request/response shapes, DTOs, and enums are generated live from the
code at `/api/docs` — that's the source of truth; this table is a map, not
a spec.
