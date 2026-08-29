import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { RestaurantSummary } from '@dinescout/shared-types';
import { AuthService } from '../../core/services/auth.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { RestaurantsService } from '../../core/services/restaurants.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { RestaurantCardComponent } from '../../shared/components/restaurant-card/restaurant-card.component';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSpinner,
    EmptyStateComponent,
    RestaurantCardComponent,
  ],
  templateUrl: './favorites.page.html',
  styleUrl: './favorites.page.scss',
})
export class FavoritesPage implements OnInit {
  private readonly favorites = inject(FavoritesService);
  private readonly restaurantsService = inject(RestaurantsService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly restaurants = signal<RestaurantSummary[]>([]);
  readonly isLoggedIn = computed(() => this.auth.isLoggedIn());

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    if (this.auth.isLoggedIn()) {
      const list = await this.favorites.listFavoriteRestaurants();
      this.restaurants.set(list);
      this.loading.set(false);
      return;
    }

    // Anonymous: we only have ids on-device — fetch each restaurant's
    // current details so favorites still show real, live data.
    const ids = Array.from(this.favorites.favoriteIds());
    if (ids.length === 0) {
      this.restaurants.set([]);
      this.loading.set(false);
      return;
    }
    const results = await Promise.all(
      ids.map((id) =>
        new Promise<RestaurantSummary | null>((resolve) => {
          this.restaurantsService.getById(id).subscribe({
            next: (r) => resolve(r),
            error: () => resolve(null),
          });
        }),
      ),
    );
    this.restaurants.set(results.filter((r): r is RestaurantSummary => r !== null));
    this.loading.set(false);
  }

  withFav(restaurant: RestaurantSummary): RestaurantSummary {
    return this.favorites.withFavoriteStatus(restaurant);
  }

  openRestaurant(restaurant: RestaurantSummary): void {
    void this.router.navigate(['/restaurants', restaurant.id]);
  }

  async toggleFavorite(restaurant: RestaurantSummary): Promise<void> {
    await this.favorites.toggle(restaurant.id);
    this.restaurants.update((list) => list.filter((r) => r.id !== restaurant.id));
  }

  goToLogin(): void {
    void this.router.navigate(['/auth/login']);
  }

  browseRestaurants(): void {
    void this.router.navigate(['/tabs/search']);
  }
}
