import { Injectable, inject } from '@angular/core';
import { Cuisine, DietaryOption } from '@dinescout/shared-types';
import { Observable, shareReplay } from 'rxjs';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class CuisinesService {
  private readonly api = inject(ApiClientService);

  // Lookup data changes rarely — cache the one shared subscription for the
  // lifetime of the app instead of re-fetching on every carousel render.
  private readonly cuisines$: Observable<Cuisine[]> = this.api
    .get<Cuisine[]>('/cuisines')
    .pipe(shareReplay(1));

  private readonly dietaryOptions$: Observable<DietaryOption[]> = this.api
    .get<DietaryOption[]>('/dietary-options')
    .pipe(shareReplay(1));

  listCuisines(): Observable<Cuisine[]> {
    return this.cuisines$;
  }

  listDietaryOptions(): Observable<DietaryOption[]> {
    return this.dietaryOptions$;
  }
}
