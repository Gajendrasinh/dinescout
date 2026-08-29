import { Injectable, inject } from '@angular/core';
import { Review, ReviewListQuery, ReviewSummaryResponse } from '@dinescout/shared-types';
import { Observable } from 'rxjs';
import { ApiClientService, ApiListResult } from './api-client.service';

export interface CreateReviewPayload {
  rating: number;
  title: string;
  comment: string;
  photoUrls?: string[];
}

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly api = inject(ApiClientService);

  list(restaurantId: string, query: ReviewListQuery): Observable<ApiListResult<Review>> {
    return this.api.getList<Review>(`/restaurants/${restaurantId}/reviews`, query);
  }

  summary(restaurantId: string): Observable<ReviewSummaryResponse> {
    return this.api.get<ReviewSummaryResponse>(`/restaurants/${restaurantId}/reviews/summary`);
  }

  create(restaurantId: string, payload: CreateReviewPayload): Observable<Review> {
    return this.api.post<Review>(`/restaurants/${restaurantId}/reviews`, payload);
  }

  update(reviewId: string, payload: Partial<CreateReviewPayload>): Observable<Review> {
    return this.api.patch<Review>(`/reviews/${reviewId}`, payload);
  }

  remove(reviewId: string): Observable<void> {
    return this.api.deleteVoid(`/reviews/${reviewId}`);
  }

  report(reviewId: string, reason: string, note?: string): Observable<void> {
    return this.api.postVoid(`/reviews/${reviewId}/report`, { reason, note });
  }

  aiSummary(restaurantId: string): Observable<{ summary: string; degraded: boolean }> {
    return this.api.get(`/restaurants/${restaurantId}/ai-summary`);
  }
}
