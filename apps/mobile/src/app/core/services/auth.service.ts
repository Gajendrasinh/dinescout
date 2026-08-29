import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '@dinescout/shared-types';
import { firstValueFrom } from 'rxjs';
import { ApiClientService } from './api-client.service';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClientService);
  private readonly tokens = inject(TokenStorageService);

  private readonly currentUserSignal = signal<User | null>(null);
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUserSignal() !== null);

  async bootstrap(): Promise<void> {
    await this.tokens.warmCache();
    const accessToken = await this.tokens.getAccessToken();
    if (!accessToken) return;
    try {
      const user = await firstValueFrom(this.api.get<User>('/users/me'));
      this.currentUserSignal.set(user);
    } catch {
      // Access token expired/invalid and couldn't silently refresh — treat
      // as logged out rather than surfacing an error at app start.
      await this.tokens.clear();
    }
  }

  async register(request: RegisterRequest): Promise<void> {
    const res = await firstValueFrom(this.api.post<AuthResponse>('/auth/register', request));
    await this.tokens.setTokens(res.tokens.accessToken, res.tokens.refreshToken);
    this.currentUserSignal.set(res.user);
  }

  async login(request: LoginRequest): Promise<void> {
    const res = await firstValueFrom(this.api.post<AuthResponse>('/auth/login', request));
    await this.tokens.setTokens(res.tokens.accessToken, res.tokens.refreshToken);
    this.currentUserSignal.set(res.user);
  }

  async logout(): Promise<void> {
    const refreshToken = await this.tokens.getRefreshToken();
    if (refreshToken) {
      try {
        await firstValueFrom(this.api.postVoid('/auth/logout', { refreshToken }));
      } catch {
        // Best-effort server-side revoke — clear local state regardless.
      }
    }
    await this.tokens.clear();
    this.currentUserSignal.set(null);
  }

  async forgotPassword(email: string): Promise<void> {
    await firstValueFrom(this.api.post('/auth/forgot-password', { email }));
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await firstValueFrom(this.api.post('/auth/reset-password', { token, newPassword }));
  }
}
