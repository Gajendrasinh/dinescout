# DineScout Admin

Angular 19 admin console (dashboard, restaurant management, review
moderation, reports, users). Standalone components, plain Angular (no
Ionic) — this is an internal, web-only tool.

```bash
# from the repo root
npm run dev:admin         # ng serve, http://localhost:4200
npm run build --workspace apps/admin        # dev build
npm run build:prod --workspace apps/admin   # production build
npm run test --workspace apps/admin         # Karma/Jasmine unit tests
npm run lint --workspace apps/admin
```

Sign in with a seeded ADMIN or MODERATOR account (see the root README's
"Demo accounts" section) against a running API — set the API URL in
`src/environments/environment.ts`.

Only `ADMIN`/`MODERATOR` accounts can sign in; the `Users` section and
restaurant create/edit/delete are `ADMIN`-only, review moderation and
reports are available to both roles — enforced both here (hiding nav
items) and, authoritatively, by the API's `RolesGuard`.
