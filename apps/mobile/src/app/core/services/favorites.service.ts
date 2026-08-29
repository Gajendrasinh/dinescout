import { Injectable, computed, inject, signal } from '@angular/core';
import { RestaurantSummary } from '@dinescout/shared-types';
import { Preferences } from '@capacitor/preferences';
import { firstValueFrom } from 'rxjs';
import { ApiClientService } from './api-client.service';
import { AuthService } from './auth.service';

const LOCAL_FAVORITES_KEY = 'dinescout.localFavorites';

/**
 * Favorites work for anonymous users (persisted on-device via Capacitor
 * Preferences) and for authenticated users (persisted server-side). Toggle
 * calls update the in-memory signal immediately (optimistic UI) and roll
 * back only if the persistence call actually fails.
 */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly api = inject(ApiClientService);
  private readonly auth = inject(AuthService);

  private readonly favoriteIdsSignal = signal<Set<string>>(new Set());
  readonly favoriteIds = this.favoriteIdsSignal.asReadonly();
  readonly count = computed(() => this.favoriteIdsSignal().size);

  async bootstrap(): Promise<void> {
    if (this.auth.isLoggedIn()) {
      await this.loadFromServer();
      await this.mergeLocalIntoServer();
    } else {
      await this.loadFromLocal();
    }
  }

  isFavorite(restaurantId: string): boolean {
    return this.favoriteIdsSignal().has(restaurantId);
  }

  /** Returns a copy of the restaurant with `isFavorite` reconciled against
   *  this client's own favorites state — needed because an anonymous
   *  user's favorites live only on-device, so the server's per-request
   *  `isFavorite` (always false for anonymous requests) isn't enough. */
  withFavoriteStatus<T extends RestaurantSummary>(restaurant: T): T {
    return { ...restaurant, isFavorite: this.isFavorite(restaurant.id) };
  }

  async toggle(restaurantId: string): Promise<void> {
    const wasFavorite = this.isFavorite(restaurantId);
    this.updateSignal(restaurantId, !wasFavorite);

    try {
      if (this.auth.isLoggedIn()) {
        if (wasFavorite) {
          await firstValueFrom(this.api.deleteVoid(`/favorites/${restaurantId}`));
        } else {
          await firstValueFrom(this.api.postVoid(`/favorites/${restaurantId}`));
        }
      } else {
        await this.persistLocal();
      }
    } catch {
      // Roll back the optimistic update if persistence actually failed.
      this.updateSignal(restaurantId, wasFavorite);
    }
  }

  async listFavoriteRestaurants(): Promise<RestaurantSummary[]> {
    if (this.auth.isLoggedIn()) {
      return firstValueFrom(this.api.get<RestaurantSummary[]>('/favorites'));
    }
    // Anonymous users only have ids locally — callers needing full
    // restaurant details for local favorites should fetch each by id.
    return [];
  }

  private updateSignal(restaurantId: string, isFavorite: boolean): void {
    const next = new Set(this.favoriteIdsSignal());
    if (isFavorite) next.add(restaurantId);
    else next.delete(restaurantId);
    this.favoriteIdsSignal.set(next);
  }

  private async loadFromServer(): Promise<void> {
    try {
      const favorites = await firstValueFrom(this.api.get<RestaurantSummary[]>('/favorites'));
      this.favoriteIdsSignal.set(new Set(favorites.map((f) => f.id)));
    } catch {
      this.favoriteIdsSignal.set(new Set());
    }
  }

  private async loadFromLocal(): Promise<void> {
    const { value } = await Preferences.get({ key: LOCAL_FAVORITES_KEY });
    const ids: string[] = value ? JSON.parse(value) : [];
    this.favoriteIdsSignal.set(new Set(ids));
  }

  private async persistLocal(): Promise<void> {
    const ids = Array.from(this.favoriteIdsSignal());
    await Preferences.set({ key: LOCAL_FAVORITES_KEY, value: JSON.stringify(ids) });
  }

  /** After login, push any restaurants favorited anonymously up to the
   *  server, then clear the local list — the server becomes the single
   *  source of truth for a logged-in session. */
  private async mergeLocalIntoServer(): Promise<void> {
    const { value } = await Preferences.get({ key: LOCAL_FAVORITES_KEY });
    const localIds: string[] = value ? JSON.parse(value) : [];
    if (localIds.length === 0) return;

    await Promise.all(
      localIds.map((id) =>
        firstValueFrom(this.api.postVoid(`/favorites/${id}`)).catch(() => undefined),
      ),
    );
    await Preferences.remove({ key: LOCAL_FAVORITES_KEY });
    await this.loadFromServer();
  }
}
