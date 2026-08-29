import { RestaurantSummary } from '@dinescout/shared-types';
import { Coordinates } from '../location.service';

/**
 * Provider-independent map abstraction. Feature code (MapPage,
 * RestaurantDetails "Directions" button) depends only on this interface,
 * never on a specific vendor SDK — swapping Google Maps for Mapbox or
 * Apple Maps is a new provider implementation, not a feature rewrite.
 */
export interface MapProvider {
  initialize(): Promise<void>;
  showRestaurants(restaurants: RestaurantSummary[]): void;
  showUserLocation(coordinates: Coordinates): void;
  openDirections(destination: Coordinates, label?: string): Promise<void>;
}

export const MAP_PROVIDER = Symbol('MAP_PROVIDER');
