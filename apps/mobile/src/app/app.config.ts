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
      await inject(AuthService).bootstrap();
      await inject(FavoritesService).bootstrap();
    }),
  ],
};
