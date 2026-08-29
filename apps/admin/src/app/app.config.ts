import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    // Resolves the current session (if any) *before* the router evaluates
    // the initial route's guards. Without this, a hard reload/deep link
    // straight into a guarded route races adminGuard's synchronous check
    // against AuthService's async /users/me call and loses — bouncing a
    // genuinely logged-in admin back to /login.
    provideAppInitializer(() => inject(AuthService).bootstrap()),
  ],
};
