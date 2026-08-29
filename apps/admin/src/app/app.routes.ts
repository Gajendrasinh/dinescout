import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'restaurants',
        loadComponent: () =>
          import('./features/restaurants/restaurants-list.page').then(
            (m) => m.RestaurantsListPage,
          ),
      },
      {
        path: 'restaurants/:id',
        loadComponent: () =>
          import('./features/restaurants/restaurant-form.page').then(
            (m) => m.RestaurantFormPage,
          ),
      },
      {
        path: 'reviews',
        loadComponent: () =>
          import('./features/reviews/reviews-queue.page').then((m) => m.ReviewsQueuePage),
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.page').then((m) => m.ReportsPage),
      },
      {
        path: 'users',
        loadComponent: () => import('./features/users/users.page').then((m) => m.UsersPage),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
