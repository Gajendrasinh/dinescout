import { Injectable, inject } from '@angular/core';
import { Restaurant, RestaurantSearchQuery, RestaurantSummary } from '@dinescout/shared-types';
import { Observable } from 'rxjs';
import { ApiClientService, ApiListResult } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class RestaurantsService {
  private readonly api = inject(ApiClientService);

  search(query: RestaurantSearchQuery): Observable<ApiListResult<RestaurantSummary>> {
    return this.api.getList<RestaurantSummary>('/restaurants', query);
  }

  getById(idOrSlug: string): Observable<Restaurant> {
    return this.api.get<Restaurant>(`/restaurants/${idOrSlug}`);
  }
}
