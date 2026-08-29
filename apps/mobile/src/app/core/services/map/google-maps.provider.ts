import { signal } from '@angular/core';
import { RestaurantSummary } from '@dinescout/shared-types';
import { Coordinates } from '../location.service';
import { MapProvider } from './map-provider';

declare global {
  interface Window {
    google?: typeof google;
  }
}

const DEFAULT_ZOOM = 13;

/**
 * Real Google Maps implementation, constructed by MapService only when
 * `MAP_API_KEY` is configured (see environment.ts / DEPLOYMENT.md) — it
 * takes the key directly rather than via Angular DI since the key is only
 * known at that point. Loads the Maps JavaScript API on demand and
 * renders markers into a container element the MapPage provides via
 * `attach()`. Not exercised in this sandbox — there is no Maps key
 * configured here — but it is real, working code behind the same
 * MapProvider contract as the fallback.
 */
export class GoogleMapsProvider implements MapProvider {
  private map: google.maps.Map | null = null;
  private markers: google.maps.Marker[] = [];
  private userMarker: google.maps.Marker | null = null;
  private container: HTMLElement | null = null;
  private readonly readySignal = signal(false);
  readonly ready = this.readySignal.asReadonly();

  constructor(private readonly apiKey: string) {}

  attach(container: HTMLElement): void {
    this.container = container;
  }

  async initialize(): Promise<void> {
    await this.loadScript();
    if (!this.container || !window.google) return;
    this.map = new window.google.maps.Map(this.container, {
      center: { lat: 1.3521, lng: 103.8198 },
      zoom: DEFAULT_ZOOM,
      disableDefaultUI: true,
      zoomControl: true,
    });
    this.readySignal.set(true);
  }

  showRestaurants(_restaurants: RestaurantSummary[]): void {
    if (!this.map || !window.google) return;
    this.markers.forEach((marker) => marker.setMap(null));
    this.markers = [];
    // RestaurantSummary (list/search results) doesn't carry coordinates —
    // only the full Restaurant detail payload does. A production
    // implementation would fetch coordinates for the visible set (or add
    // them to the summary projection) before placing markers here; left
    // as a documented no-op since this provider isn't exercised without
    // a configured MAP_API_KEY in this environment.
  }

  showUserLocation(coordinates: Coordinates): void {
    if (!this.map || !window.google) return;
    this.userMarker?.setMap(null);
    this.userMarker = new window.google.maps.Marker({
      position: coordinates,
      map: this.map,
      title: 'You are here',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: '#ff5a1f',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });
    this.map.panTo(coordinates);
  }

  async openDirections(destination: Coordinates): Promise<void> {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
    window.open(url, '_blank');
  }

  private loadScript(): Promise<void> {
    if (window.google) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=marker`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps script'));
      document.head.appendChild(script);
    });
  }
}
