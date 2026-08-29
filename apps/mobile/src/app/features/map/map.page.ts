import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonIcon, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { RestaurantSummary } from '@dinescout/shared-types';
import { environment } from '../../../environments/environment';
import { FavoritesService } from '../../core/services/favorites.service';
import { LocationService } from '../../core/services/location.service';
import { MapService } from '../../core/services/map/map.service';
import { RestaurantsService } from '../../core/services/restaurants.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { RestaurantCardComponent } from '../../shared/components/restaurant-card/restaurant-card.component';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    EmptyStateComponent,
    RestaurantCardComponent,
  ],
  templateUrl: './map.page.html',
  styleUrl: './map.page.scss',
})
export class MapPage implements OnInit {
  private readonly locationService = inject(LocationService);
  private readonly restaurantsService = inject(RestaurantsService);
  private readonly favorites = inject(FavoritesService);
  private readonly router = inject(Router);
  readonly mapService = inject(MapService);

  readonly loading = signal(true);
  readonly restaurants = signal<RestaurantSummary[]>([]);
  readonly locationDenied = signal(false);

  ngOnInit(): void {
    void this.init();
  }

  private async init(): Promise<void> {
    await this.mapService.provider.initialize();
    const coords = await this.locationService.requestCurrentLocation();
    if (!coords) this.locationDenied.set(true);

    const effectiveCoords = coords ?? environment.defaultCoordinates;
    this.mapService.provider.showUserLocation(effectiveCoords);

    this.restaurantsService
      .search({ lat: effectiveCoords.lat, lng: effectiveCoords.lng, radius: 5, sort: 'distance', limit: 30 })
      .subscribe((res) => {
        this.restaurants.set(res.data);
        this.mapService.provider.showRestaurants(res.data);
        this.loading.set(false);
      });
  }

  async requestLocation(): Promise<void> {
    const coords = await this.locationService.requestCurrentLocation();
    if (coords) {
      this.locationDenied.set(false);
      this.mapService.provider.showUserLocation(coords);
    }
  }

  withFav(restaurant: RestaurantSummary): RestaurantSummary {
    return this.favorites.withFavoriteStatus(restaurant);
  }

  openRestaurant(restaurant: RestaurantSummary): void {
    void this.router.navigate(['/restaurants', restaurant.id]);
  }

  async toggleFavorite(restaurant: RestaurantSummary): Promise<void> {
    await this.favorites.toggle(restaurant.id);
  }
}
