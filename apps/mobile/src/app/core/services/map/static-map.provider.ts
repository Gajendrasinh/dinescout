import { Injectable, signal } from '@angular/core';
import { RestaurantSummary } from '@dinescout/shared-types';
import { Browser } from '@capacitor/browser';
import { Coordinates } from '../location.service';
import { MapProvider } from './map-provider';

/**
 * Zero-credential fallback map provider. Renders no map tiles — the
 * MapPage displays the restaurant list this provider holds, sorted by
 * distance, instead. "Directions" still works with no API key: it deep-
 * links to the device's own default maps app via a universal maps URL.
 * Swap in GoogleMapsProvider (or Mapbox/Apple Maps) once MAP_API_KEY is
 * configured — MapPage's template code does not change either way.
 */
@Injectable({ providedIn: 'root' })
export class StaticMapProvider implements MapProvider {
  private readonly restaurantsSignal = signal<RestaurantSummary[]>([]);
  private readonly userLocationSignal = signal<Coordinates | null>(null);

  readonly restaurants = this.restaurantsSignal.asReadonly();
  readonly userLocation = this.userLocationSignal.asReadonly();

  async initialize(): Promise<void> {
    // No SDK to boot — resolves immediately.
  }

  showRestaurants(restaurants: RestaurantSummary[]): void {
    this.restaurantsSignal.set(restaurants);
  }

  showUserLocation(coordinates: Coordinates): void {
    this.userLocationSignal.set(coordinates);
  }

  async openDirections(destination: Coordinates, label?: string): Promise<void> {
    const url = new URL('https://www.google.com/maps/dir/');
    url.searchParams.set('api', '1');
    url.searchParams.set('destination', `${destination.lat},${destination.lng}`);
    if (label) url.searchParams.set('destination_place_id', label);
    await Browser.open({ url: url.toString() });
  }
}
