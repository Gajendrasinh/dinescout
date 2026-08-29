import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

const ACCESS_TOKEN_KEY = 'dinescout.accessToken';
const REFRESH_TOKEN_KEY = 'dinescout.refreshToken';

/**
 * Persists auth tokens via Capacitor Preferences, which is backed by
 * Keychain/Keystore on native platforms and localStorage on web — one API
 * for all three targets (iOS/Android/Web) per the Capacitor abstraction
 * pattern used throughout core/services.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private accessTokenCache: string | null = null;

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    this.accessTokenCache = accessToken;
    await Promise.all([
      Preferences.set({ key: ACCESS_TOKEN_KEY, value: accessToken }),
      Preferences.set({ key: REFRESH_TOKEN_KEY, value: refreshToken }),
    ]);
  }

  async getAccessToken(): Promise<string | null> {
    if (this.accessTokenCache) return this.accessTokenCache;
    const { value } = await Preferences.get({ key: ACCESS_TOKEN_KEY });
    this.accessTokenCache = value;
    return value;
  }

  /** Synchronous best-effort read for the HTTP interceptor's hot path. */
  getAccessTokenSync(): string | null {
    return this.accessTokenCache;
  }

  async getRefreshToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: REFRESH_TOKEN_KEY });
    return value;
  }

  async clear(): Promise<void> {
    this.accessTokenCache = null;
    await Promise.all([
      Preferences.remove({ key: ACCESS_TOKEN_KEY }),
      Preferences.remove({ key: REFRESH_TOKEN_KEY }),
    ]);
  }

  /** Called once at app start so the sync accessor has a value immediately. */
  async warmCache(): Promise<void> {
    const { value } = await Preferences.get({ key: ACCESS_TOKEN_KEY });
    this.accessTokenCache = value;
  }
}
