# Database

PostgreSQL 16, accessed exclusively through **Prisma** (`apps/api/prisma/schema.prisma`).
No raw SQL in application code except the two deliberate, reviewed
exceptions in `apps/api/test/jest-e2e.global-setup.ts` (a `TRUNCATE` to
reset the e2e database between runs) — nothing user-input-driven ever
reaches raw SQL, so there's no first-party SQL-injection surface.

## Models (22)

| Domain | Models |
|---|---|
| Users & auth | `User`, `RefreshToken`, `PasswordResetToken`, `UserPreferences` |
| Taxonomy | `Cuisine`, `DietaryOption` |
| Restaurants | `Restaurant`, `RestaurantCuisine`, `RestaurantDietaryOption`, `RestaurantHour`, `RestaurantPhoto` |
| Menu | `MenuCategory`, `MenuItem` |
| Reviews | `Review`, `ReviewPhoto`, `ReviewReport` |
| Engagement | `Favorite`, `SearchHistory` |
| AI | `AiConversation`, `AiMessage` |
| Ops | `Notification`, `AuditLog` |

Key enums: `UserRole` (USER/ADMIN/MODERATOR), `RestaurantStatus`
(DRAFT/PUBLISHED/UNPUBLISHED), `PriceRange` (BUDGET…FINE_DINING),
`ReviewStatus` (PENDING/PUBLISHED/FLAGGED/REMOVED), `ReviewReportReason`,
`ReviewReportStatus`, `AiMessageRole`, `NotificationType`.

## Notable design decisions

- **Soft delete for restaurants**: `Restaurant.deletedAt` + `status`.
  `RestaurantsService.findOne()` filters on *both*
  `deletedAt: null` and `status: PUBLISHED` — a DRAFT or UNPUBLISHED
  restaurant is invisible to the public API even if you have its exact ID
  (this was a real bug — found and fixed — before that second filter was
  added; see `docs/SECURITY.md`).
- **Refresh-token families**: `RefreshToken.family` groups every token
  descended from one login. `AuthService` rotates the token on every
  `/auth/refresh` and revokes the whole family if an already-rotated-out
  token is presented again — the standard mitigation for a stolen refresh
  token being replayed.
- **One review per user per restaurant**: enforced with a unique
  constraint on `(restaurantId, userId)`, surfaced to the API as a `409`.
- **Review moderation is async by design**: `ReviewStatus` starts at
  `PENDING`, is checked by `reviews/providers/profanity-filter.provider.ts`
  and `spam-detector.provider.ts`, and can be moved to `FLAGGED`/`REMOVED`
  by an admin/moderator — a review isn't blindly trusted just because a
  user submitted it.

## Indexes

24 `@@index` declarations target the actual hot paths, not just foreign
keys — e.g. `Restaurant` on `status`, `[lat, lng]` (geo search), and
`ratingAvg` (sort-by-rating); `Review` on `[restaurantId, status]`
(the exact filter the public reviews list uses) and `userId`; `MenuItem`
on `[restaurantId, categoryId]` and `name` (dish search);
`RefreshToken` on `userId` and `family`.

## Migrations & seed data

```bash
npm run prisma:migrate --workspace apps/api    # dev: creates/applies a migration
npm run prisma:migrate:deploy --workspace apps/api   # CI/prod: applies existing migrations only
npm run prisma:seed --workspace apps/api
```

`apps/api/prisma/seed/index.ts` generates deterministic-shape realistic
data: 50 restaurants (18 cuisines cycled), 346 menu items, 552 reviews,
and 17 users (1 admin, 1 moderator, 15 diners — all `Password123!`). It's
what every test suite, the AI's local-heuristic fallback, and manual dev
all run against — there's no separate "demo mode" with different, thinner
data.
