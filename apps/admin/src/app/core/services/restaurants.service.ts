import { Injectable, inject } from '@angular/core';
import { Restaurant, RestaurantSummary } from '@dinescout/shared-types';
import { Observable } from 'rxjs';
import { ApiClientService, ApiListResult } from './api-client.service';

export interface UpsertRestaurantPayload {
  name: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  website?: string;
  priceRange: string;
  cuisineSlugs: string[];
  dietarySlugs?: string[];
  photos?: { url: string; alt?: string; isPrimary?: boolean }[];
  hours?: { dayOfWeek: number; opensAt: string; closesAt: string; isClosed?: boolean }[];
}

@Injectable({ providedIn: 'root' })
export class AdminRestaurantsService {
  private readonly api = inject(ApiClientService);

  list(query: { page?: number; limit?: number; status?: string }): Observable<ApiListResult<RestaurantSummary>> {
    return this.api.getList<RestaurantSummary>('/admin/restaurants', query);
  }

  getOne(id: string): Observable<Restaurant> {
    return this.api.get<Restaurant>(`/admin/restaurants/${id}`);
  }

  create(payload: UpsertRestaurantPayload): Observable<Restaurant> {
    return this.api.post<Restaurant>('/admin/restaurants', payload);
  }

  update(id: string, payload: UpsertRestaurantPayload): Observable<Restaurant> {
    return this.api.patch<Restaurant>(`/admin/restaurants/${id}`, payload);
  }

  publish(id: string): Observable<Restaurant> {
    return this.api.patch<Restaurant>(`/admin/restaurants/${id}/publish`);
  }

  unpublish(id: string): Observable<Restaurant> {
    return this.api.patch<Restaurant>(`/admin/restaurants/${id}/unpublish`);
  }

  remove(id: string): Observable<void> {
    return this.api.deleteVoid(`/admin/restaurants/${id}`);
  }
}
