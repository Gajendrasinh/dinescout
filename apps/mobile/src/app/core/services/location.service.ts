import { Injectable, signal } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';

export interface Coordinates {
  lat: number;
  lng: number;
}

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

/**
 * Wraps @capacitor/geolocation. Location is never required to browse
 * DineScout — every caller must handle `coordinates()` being null and
 * degrade gracefully (no distance sort/filter, no "near me" personalization).
 */
@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly statusSignal = signal<LocationStatus>('idle');
  private readonly coordinatesSignal = signal<Coordinates | null>(null);

  readonly status = this.statusSignal.asReadonly();
  readonly coordinates = this.coordinatesSignal.asReadonly();

  async requestCurrentLocation(): Promise<Coordinates | null> {
    this.statusSignal.set('requesting');
    try {
      const permission = await Geolocation.requestPermissions();
      if (permission.location !== 'granted' && permission.coarseLocation !== 'granted') {
        this.statusSignal.set('denied');
        return null;
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 8000,
      });
      const coords: Coordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      this.coordinatesSignal.set(coords);
      this.statusSignal.set('granted');
      return coords;
    } catch {
      this.statusSignal.set('unavailable');
      return null;
    }
  }

  /** Falls back to the demo city center (Singapore) when location isn't
   *  available, so "nearby" features still show something reasonable. */
  getCoordinatesOrDefault(defaultCoords: Coordinates): Coordinates {
    return this.coordinatesSignal() ?? defaultCoords;
  }
}
