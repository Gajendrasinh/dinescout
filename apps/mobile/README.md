# DineScout Mobile

Ionic 9 + Angular 19 app (standalone components, signals, lazy-loaded
routes) for iOS, Android, and Web.

See the repo root [`README.md`](../../README.md) for full setup. Quick
reference for this app:

```bash
# from the repo root
npm run dev:mobile        # ng serve, http://localhost:4200
npm run build --workspace apps/mobile         # dev build
npm run build:prod --workspace apps/mobile    # production build
npm run test --workspace apps/mobile          # Karma/Jasmine unit tests
npm run lint --workspace apps/mobile
```

Point it at a running API by editing `src/environments/environment.ts`
(`apiBaseUrl`), or at build time via the standard Angular file-replacement
mechanism for `environment.prod.ts`.

## Mobile builds (iOS/Android)

Native projects are **not** generated in this repository (no Xcode/Android
Studio in the environment this was built in) but the app is fully
Capacitor-ready:

```bash
npm run build:prod --workspace apps/mobile
npx cap add ios       # first time only
npx cap add android    # first time only
npx cap sync
npx cap open ios       # opens Xcode
npx cap open android   # opens Android Studio
```

See `capacitor.config.ts` for the app id/name and the local-dev `server.url`
override, and the root `DEPLOYMENT.md` for deep-link (universal link /
app link) manifest setup on each platform.
