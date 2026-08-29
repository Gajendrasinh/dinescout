import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonSearchbar,
  IonToolbar,
} from '@ionic/angular';
import { Cuisine, DietaryOption, RestaurantSummary } from '@dinescout/shared-types';
import { environment } from '../../../environments/environment';
import { AnalyticsService } from '../../core/services/analytics.service';
import { CuisinesService } from '../../core/services/cuisines.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { LocationService } from '../../core/services/location.service';
import { RestaurantsService } from '../../core/services/restaurants.service';
import { ChipComponent } from '../../shared/components/chip/chip.component';
import { RestaurantCardComponent } from '../../shared/components/restaurant-card/restaurant-card.component';
import { AnalyticsEvent } from '@dinescout/shared-types';

interface HomeSection {
  title: string;
  restaurants: RestaurantSummary[];
  loading: boolean;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonSearchbar,
    IonIcon,
    ChipComponent,
    RestaurantCardComponent,
  ],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage implements OnInit {
  private readonly restaurantsService = inject(RestaurantsService);
  private readonly cuisinesService = inject(CuisinesService);
  private readonly locationService = inject(LocationService);
  private readonly favorites = inject(FavoritesService);
  private readonly analytics = inject(AnalyticsService);
  private readonly router = inject(Router);

  readonly city = environment.defaultCity;
  readonly cuisines = signal<Cuisine[]>([]);
  readonly dietaryOptions = signal<DietaryOption[]>([]);
  readonly selectedDietary = signal<string | null>(null);

  readonly sections = signal<HomeSection[]>([
    { title: 'Near You', restaurants: [], loading: true },
    { title: 'Top Rated', restaurants: [], loading: true },
    { title: 'Popular This Week', restaurants: [], loading: true },
    { title: 'Recommended For You', restaurants: [], loading: true },
  ]);

  readonly skeletonPlaceholders = Array.from({ length: 3 });

  ngOnInit(): void {
    this.cuisinesService.listCuisines().subscribe((c) => this.cuisines.set(c));
    this.cuisinesService.listDietaryOptions().subscribe((d) => this.dietaryOptions.set(d));
    void this.loadSections();
  }

  private async loadSections(): Promise<void> {
    const coords = this.locationService.getCoordinatesOrDefault(environment.defaultCoordinates);

    this.restaurantsService
      .search({ lat: coords.lat, lng: coords.lng, radius: 5, sort: 'distance', limit: 8 })
      .subscribe((res) => this.setSection(0, res.data));

    this.restaurantsService
      .search({ ratingMin: 4.5, sort: 'rating', limit: 8 })
      .subscribe((res) => this.setSection(1, res.data));

    this.restaurantsService
      .search({ sort: 'popularity', limit: 8 })
      .subscribe((res) => this.setSection(2, res.data));

    // "Recommended" starts from the same ranking signals (rating + price)
    // the recommendation engine formalizes server-side — see AI.md. A
    // logged-in user's saved preferences narrow this further once
    // available.
    this.restaurantsService
      .search({ sort: 'rating', limit: 8 })
      .subscribe((res) => this.setSection(3, res.data));
  }

  private setSection(index: number, restaurants: RestaurantSummary[]): void {
    this.sections.update((sections) => {
      const next = [...sections];
      next[index] = { ...next[index], restaurants, loading: false };
      return next;
    });
  }

  onCuisineSelected(slug: string): void {
    void this.router.navigate(['/tabs/search'], { queryParams: { cuisine: slug } });
  }

  onDietaryToggled(slug: string): void {
    this.selectedDietary.set(this.selectedDietary() === slug ? null : slug);
    void this.router.navigate(['/tabs/search'], {
      queryParams: { dietary: this.selectedDietary() ?? undefined },
    });
  }

  onSearchFocused(): void {
    void this.router.navigate(['/tabs/search']);
  }

  openRestaurant(restaurant: RestaurantSummary): void {
    this.analytics.track(AnalyticsEvent.RESTAURANT_VIEWED, {
      restaurantId: restaurant.id,
      source: 'home',
    });
    void this.router.navigate(['/restaurants', restaurant.id]);
  }

  async toggleFavorite(restaurant: RestaurantSummary): Promise<void> {
    await this.favorites.toggle(restaurant.id);
    this.analytics.track(AnalyticsEvent.RESTAURANT_FAVORITED, { restaurantId: restaurant.id });
  }

  withFav(restaurant: RestaurantSummary): RestaurantSummary {
    return this.favorites.withFavoriteStatus(restaurant);
  }

  openAiChat(): void {
    this.analytics.track(AnalyticsEvent.AI_CHAT_STARTED, { source: 'home' });
    void this.router.navigate(['/ai-chat']);
  }
}
