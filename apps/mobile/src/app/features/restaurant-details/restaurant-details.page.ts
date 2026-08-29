import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonSkeletonText,
} from '@ionic/angular';
import { AnalyticsEvent, Restaurant, ReviewSummaryResponse } from '@dinescout/shared-types';
import { AnalyticsService } from '../../core/services/analytics.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { MapService } from '../../core/services/map/map.service';
import { NativeService } from '../../core/services/native.service';
import { OfflineCacheService } from '../../core/services/offline-cache.service';
import { RestaurantsService } from '../../core/services/restaurants.service';
import { ReviewsService } from '../../core/services/reviews.service';
import { StarRatingComponent } from '../../shared/components/star-rating/star-rating.component';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Component({
  selector: 'app-restaurant-details',
  standalone: true,
  imports: [CommonModule, IonContent, IonButton, IonIcon, IonSkeletonText, StarRatingComponent],
  templateUrl: './restaurant-details.page.html',
  styleUrl: './restaurant-details.page.scss',
})
export class RestaurantDetailsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly restaurantsService = inject(RestaurantsService);
  private readonly reviewsService = inject(ReviewsService);
  private readonly favorites = inject(FavoritesService);
  private readonly mapService = inject(MapService);
  private readonly native = inject(NativeService);
  private readonly offlineCache = inject(OfflineCacheService);
  private readonly analytics = inject(AnalyticsService);

  readonly restaurant = signal<Restaurant | null>(null);
  readonly reviewSummary = signal<ReviewSummaryResponse | null>(null);
  readonly aiSummary = signal<{ summary: string; degraded: boolean } | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly dayLabels = DAY_LABELS;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    this.restaurantsService.getById(id).subscribe({
      next: (restaurant) => {
        this.restaurant.set(restaurant);
        this.loading.set(false);
        void this.offlineCache.addRecentlyViewed(restaurant);
        this.analytics.track(AnalyticsEvent.RESTAURANT_VIEWED, { restaurantId: restaurant.id });
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });

    this.reviewsService.summary(id).subscribe((summary) => this.reviewSummary.set(summary));
    this.reviewsService.aiSummary(id).subscribe({
      next: (summary) => this.aiSummary.set(summary),
      error: () => undefined, // AI summary is a nice-to-have, never blocks the page
    });
  }

  get isFavorite(): boolean {
    const restaurant = this.restaurant();
    return restaurant ? this.favorites.withFavoriteStatus(restaurant).isFavorite : false;
  }

  async toggleFavorite(): Promise<void> {
    const restaurant = this.restaurant();
    if (!restaurant) return;
    await this.favorites.toggle(restaurant.id);
    this.analytics.track(AnalyticsEvent.RESTAURANT_FAVORITED, { restaurantId: restaurant.id });
  }

  viewMenu(): void {
    const restaurant = this.restaurant();
    if (!restaurant) return;
    this.analytics.track(AnalyticsEvent.MENU_VIEWED, { restaurantId: restaurant.id });
    void this.router.navigate(['/restaurants', restaurant.id, 'menu']);
  }

  viewReviews(): void {
    const restaurant = this.restaurant();
    if (!restaurant) return;
    void this.router.navigate(['/restaurants', restaurant.id, 'reviews']);
  }

  async call(): Promise<void> {
    const restaurant = this.restaurant();
    if (!restaurant?.phone) return;
    this.analytics.track(AnalyticsEvent.CALL_CLICKED, { restaurantId: restaurant.id });
    window.location.href = `tel:${restaurant.phone}`;
  }

  async openDirections(): Promise<void> {
    const restaurant = this.restaurant();
    if (!restaurant) return;
    this.analytics.track(AnalyticsEvent.DIRECTIONS_CLICKED, { restaurantId: restaurant.id });
    await this.mapService.provider.openDirections(restaurant.coordinates, restaurant.name);
  }

  openWebsite(): void {
    const restaurant = this.restaurant();
    if (!restaurant?.website) return;
    window.open(restaurant.website, '_blank', 'noopener');
  }

  async share(): Promise<void> {
    const restaurant = this.restaurant();
    if (!restaurant) return;
    await this.native.lightTap();
    await this.native.share({
      title: restaurant.name,
      text: `Check out ${restaurant.name} on DineScout`,
      url: `https://dinescout.app/restaurant/${restaurant.id}`,
    });
  }

  askAi(): void {
    const restaurant = this.restaurant();
    if (!restaurant) return;
    void this.router.navigate(['/ai-chat'], { queryParams: { restaurantId: restaurant.id } });
  }

  goBack(): void {
    this.location.back();
  }

  goHome(): void {
    void this.router.navigate(['/tabs/home']);
  }
}
