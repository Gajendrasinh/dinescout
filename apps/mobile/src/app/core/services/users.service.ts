import { Injectable, inject } from '@angular/core';
import { User, UserPreferences } from '@dinescout/shared-types';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

/** Update payload uses plain strings (not the branded CuisineSlug/DietaryTag
 *  enums) — the API accepts and validates plain slugs, and callers building
 *  this from user-picked chip selections work with strings, not enum
 *  members. */
export interface UpdatePreferencesPayload {
  favoriteCuisines?: string[];
  dietaryPreferences?: string[];
  pricePreference?: string;
  preferredDistanceKm?: number;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly api = inject(ApiClientService);

  getProfile(): Observable<User> {
    return this.api.get<User>('/users/me');
  }

  getPreferences(): Observable<UserPreferences> {
    return this.api.get<UserPreferences>('/users/me/preferences');
  }

  updatePreferences(preferences: UpdatePreferencesPayload): Observable<UserPreferences> {
    return this.api.patch<UserPreferences>('/users/me/preferences', preferences);
  }
}
