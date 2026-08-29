import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { GoogleMapsProvider } from './google-maps.provider';
import { MapProvider } from './map-provider';
import { StaticMapProvider } from './static-map.provider';

/**
 * Selects the active MapProvider once, at app start: GoogleMapsProvider
 * when a MAP_API_KEY is configured, StaticMapProvider (list-based, no
 * external SDK) otherwise. Every other part of the app only ever talks to
 * `MapService.provider` (typed as `MapProvider`), never to a vendor class
 * directly.
 */
@Injectable({ providedIn: 'root' })
export class MapService {
  private readonly staticProvider = inject(StaticMapProvider);

  readonly provider: MapProvider = environment.mapApiKey
    ? new GoogleMapsProvider(environment.mapApiKey)
    : this.staticProvider;

  readonly isUsingFallback = !environment.mapApiKey;
}
