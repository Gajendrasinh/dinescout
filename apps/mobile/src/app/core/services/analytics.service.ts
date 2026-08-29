import { Injectable } from '@angular/core';
import { AnalyticsEvent } from '@dinescout/shared-types';
import { environment } from '../../../environments/environment';

export interface AnalyticsProperties {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Analytics is behind this abstraction so the domain code never imports a
 * vendor SDK directly — swapping in Amplitude/Segment/PostHog/etc. later
 * means implementing this interface once, not touching every call site.
 * This is the only implementation wired up here (no analytics vendor key
 * is configured in this environment); it logs events in development so
 * the event taxonomy is still verifiable, and is silent in production
 * until a real provider is plugged in.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  track(event: AnalyticsEvent, properties: AnalyticsProperties = {}): void {
    if (!environment.production) {
      console.warn(`[analytics] ${event}`, properties);
    }
    // A real provider (e.g. Segment) would be called here, behind this
    // same method signature — nothing else in the app would change.
  }
}
