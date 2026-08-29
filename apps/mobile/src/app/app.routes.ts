import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'tabs/home', pathMatch: 'full' },
  {
    path: 'tabs',
    loadComponent: () => import('./features/shell/tabs.page').then((m) => m.TabsPage),
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'search',
        loadComponent: () => import('./features/search/search.page').then((m) => m.SearchPage),
      },
      {
        path: 'map',
        loadComponent: () => import('./features/map/map.page').then((m) => m.MapPage),
      },
      {
        path: 'favorites',
        loadComponent: () =>
          import('./features/favorites/favorites.page').then((m) => m.FavoritesPage),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.page').then((m) => m.ProfilePage),
      },
    ],
  },
  {
    path: 'restaurants/:id',
    loadComponent: () =>
      import('./features/restaurant-details/restaurant-details.page').then(
        (m) => m.RestaurantDetailsPage,
      ),
  },
  {
    path: 'restaurants/:id/menu',
    loadComponent: () => import('./features/menu/menu.page').then((m) => m.MenuPage),
  },
  {
    path: 'restaurants/:id/reviews',
    loadComponent: () => import('./features/reviews/reviews.page').then((m) => m.ReviewsPage),
  },
  {
    path: 'restaurants/:id/reviews/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/reviews/write-review.page').then((m) => m.WriteReviewPage),
  },
  {
    path: 'ai-chat',
    loadComponent: () => import('./features/ai-chat/ai-chat.page').then((m) => m.AiChatPage),
  },
  {
    path: 'profile/preferences',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/preferences.page').then((m) => m.PreferencesPage),
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./features/auth/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.page').then(
        (m) => m.ForgotPasswordPage,
      ),
  },
  { path: '**', redirectTo: 'tabs/home' },
];
