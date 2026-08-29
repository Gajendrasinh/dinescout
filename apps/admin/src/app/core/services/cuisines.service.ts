import { Injectable, inject } from '@angular/core';
import { Cuisine, DietaryOption } from '@dinescout/shared-types';
import { Observable, shareReplay } from 'rxjs';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class CuisinesService {
  private readonly api = inject(ApiClientService);

  private readonly cuisines$ = this.api.get<Cuisine[]>('/cuisines').pipe(shareReplay(1));
  private readonly dietary$ = this.api
    .get<DietaryOption[]>('/dietary-options')
    .pipe(shareReplay(1));

  listCuisines(): Observable<Cuisine[]> {
    return this.cuisines$;
  }

  listDietaryOptions(): Observable<DietaryOption[]> {
    return this.dietary$;
  }
}
