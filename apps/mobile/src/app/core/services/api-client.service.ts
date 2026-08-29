import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiListResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    [key: string]: unknown;
  };
}

/** Any flat query-params object — the shared-types `*Query` interfaces
 *  (RestaurantSearchQuery, ReviewListQuery, …) all satisfy this shape but
 *  don't declare a string index signature themselves, so this is typed
 *  loosely on purpose rather than as `Record<string, QueryValue>`. */
type QueryObject = object;

function toHttpParams(query?: QueryObject): HttpParams {
  let params = new HttpParams();
  if (!query) return params;
  for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
    if (value === undefined || value === null || value === '') continue;
    params = params.set(key, String(value));
  }
  return params;
}

/**
 * Thin wrapper over HttpClient: prefixes the API base URL and unwraps the
 * backend's standard `{ data, meta }` / `{ data }` success envelope so
 * feature services work with plain typed payloads.
 */
@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  get<T>(path: string, query?: QueryObject): Observable<T> {
    return this.http
      .get<{ data: T }>(`${this.baseUrl}${path}`, { params: toHttpParams(query) })
      .pipe(map((res) => res.data));
  }

  getList<T>(path: string, query?: QueryObject): Observable<ApiListResult<T>> {
    return this.http.get<ApiListResult<T>>(`${this.baseUrl}${path}`, {
      params: toHttpParams(query),
    });
  }

  post<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http
      .post<{ data: T }>(`${this.baseUrl}${path}`, body)
      .pipe(map((res) => res.data));
  }

  postVoid(path: string, body: unknown = {}): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}${path}`, body);
  }

  patch<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http
      .patch<{ data: T }>(`${this.baseUrl}${path}`, body)
      .pipe(map((res) => res.data));
  }

  delete<T>(path: string): Observable<T> {
    return this.http
      .delete<{ data: T }>(`${this.baseUrl}${path}`)
      .pipe(map((res) => res.data));
  }

  deleteVoid(path: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${path}`);
  }
}
