import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { App, URLOpenListenerEvent } from '@capacitor/app';

/**
 * Handles both the custom scheme (`dinescout://restaurant/:id`) and the
 * universal/app link (`https://dinescout.app/restaurant/:id`) that iOS/
 * Android hand to a running or cold-started app via `appUrlOpen`. Either
 * form resolves to the same in-app route — the OS decides at the platform
 * level whether to open the app or fall back to the web page; this
 * service only needs to handle the "app is opening" side of that.
 */
@Injectable({ providedIn: 'root' })
export class DeepLinkService {
  private readonly router = inject(Router);

  init(): void {
    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      const path = this.extractInAppPath(event.url);
      if (path) void this.router.navigateByUrl(path);
    });
  }

  private extractInAppPath(url: string): string | null {
    try {
      const parsed = new URL(url);
      // dinescout://restaurant/abc123  -> host="restaurant", pathname="/abc123"
      // https://dinescout.app/restaurant/abc123 -> pathname="/restaurant/abc123"
      const segments = (parsed.protocol === 'dinescout:' ? `${parsed.hostname}${parsed.pathname}` : parsed.pathname)
        .split('/')
        .filter(Boolean);

      if (segments[0] === 'restaurant' && segments[1]) {
        return `/restaurants/${segments[1]}`;
      }
      return null;
    } catch {
      return null;
    }
  }
}
