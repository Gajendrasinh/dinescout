import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { PreloadAllModules, provideRouter, withPreloading } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/services/auth.service';
import { FavoritesService } from './core/services/favorites.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideIonicAngular({}),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    // Resolves the session and favorites *before* the router evaluates the
    // initial route's guards — otherwise authGuard's synchronous check can
    // race AuthService's async bootstrap on a hard reload/deep link into a
    // guarded route (e.g. /profile/preferences) and wrongly redirect to login.
    provideAppInitializer(async () => {
      // Both inject() calls must happen synchronously, before the first
      // `await` — inject() only works inside an active injection context,
      // and crossing an `await` exits it (NG0203). Grab the services first,
      // then run the async bootstrap calls.
      const authService = inject(AuthService);
      const favoritesService = inject(FavoritesService);
      await authService.bootstrap();
      await favoritesService.bootstrap();
    }),
  ],
};
