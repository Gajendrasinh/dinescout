import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthResponse, LoginRequest, User } from '@dinescout/shared-types';
import { firstValueFrom } from 'rxjs';
import { ApiClientService } from './api-client.service';

const ACCESS_TOKEN_KEY = 'dinescout-admin.accessToken';
const REFRESH_TOKEN_KEY = 'dinescout-admin.refreshToken';

export class NotAdminError extends Error {
  readonly code = 'FORBIDDEN';
  constructor() {
    super('This account does not have admin access.');
  }
}

/** Admin auth is web-only, so tokens live in localStorage (vs. the mobile
 *  app's Capacitor Preferences) — simpler, and this is a trusted internal
 *  tool, not a public-facing surface. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClientService);

  private readonly currentUserSignal = signal<User | null>(null);
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUserSignal() !== null);
  readonly isAdmin = computed(() => this.currentUserSignal()?.role === 'ADMIN');
  readonly canModerate = computed(() => {
    const role = this.currentUserSignal()?.role;
    return role === 'ADMIN' || role === 'MODERATOR';
  });

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  async bootstrap(): Promise<void> {
    if (!this.getAccessToken()) return;
    try {
      const user = await firstValueFrom(this.api.get<User>('/users/me'));
      if (user.role === 'ADMIN' || user.role === 'MODERATOR') {
        this.currentUserSignal.set(user);
      } else {
        this.clearTokens();
      }
    } catch {
      this.clearTokens();
    }
  }

  async login(request: LoginRequest): Promise<void> {
    const res = await firstValueFrom(this.api.post<AuthResponse>('/auth/login', request));
    if (res.user.role !== 'ADMIN' && res.user.role !== 'MODERATOR') {
      throw new NotAdminError();
    }
    this.setTokens(res.tokens.accessToken, res.tokens.refreshToken);
    this.currentUserSignal.set(res.user);
  }

  logout(): void {
    this.clearTokens();
    this.currentUserSignal.set(null);
  }
}
