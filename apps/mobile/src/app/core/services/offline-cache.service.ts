import { Injectable } from '@angular/core';
import { RestaurantSummary } from '@dinescout/shared-types';
import { Preferences } from '@capacitor/preferences';

const RECENTLY_VIEWED_KEY = 'dinescout.recentlyViewed';
const RECENT_SEARCHES_KEY = 'dinescout.recentSearches';
const MAX_RECENTLY_VIEWED = 20;
const MAX_RECENT_SEARCHES = 10;

/**
 * Lightweight on-device cache for the "offline" requirement: recently
 * viewed restaurants and recent search terms survive app restarts and are
 * available even with no network, alongside favorites (see
 * FavoritesService) and preferences (cached by AuthService/UsersService
 * responses staying in memory for the session).
 */
@Injectable({ providedIn: 'root' })
export class OfflineCacheService {
  async addRecentlyViewed(restaurant: RestaurantSummary): Promise<void> {
    const list = await this.getRecentlyViewed();
    const deduped = [restaurant, ...list.filter((r) => r.id !== restaurant.id)].slice(
      0,
      MAX_RECENTLY_VIEWED,
    );
    await Preferences.set({ key: RECENTLY_VIEWED_KEY, value: JSON.stringify(deduped) });
  }

  async getRecentlyViewed(): Promise<RestaurantSummary[]> {
    const { value } = await Preferences.get({ key: RECENTLY_VIEWED_KEY });
    return value ? (JSON.parse(value) as RestaurantSummary[]) : [];
  }

  async addRecentSearch(query: string): Promise<void> {
    const trimmed = query.trim();
    if (!trimmed) return;
    const list = await this.getRecentSearches();
    const deduped = [trimmed, ...list.filter((q) => q !== trimmed)].slice(
      0,
      MAX_RECENT_SEARCHES,
    );
    await Preferences.set({ key: RECENT_SEARCHES_KEY, value: JSON.stringify(deduped) });
  }

  async getRecentSearches(): Promise<string[]> {
    const { value } = await Preferences.get({ key: RECENT_SEARCHES_KEY });
    return value ? (JSON.parse(value) as string[]) : [];
  }

  async clearRecentSearches(): Promise<void> {
    await Preferences.remove({ key: RECENT_SEARCHES_KEY });
  }
}
