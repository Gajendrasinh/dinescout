import { Injectable, inject } from '@angular/core';
import { Review } from '@dinescout/shared-types';
import { Observable } from 'rxjs';
import { ApiClientService, ApiListResult } from './api-client.service';

export interface ReviewReport {
  id: string;
  reason: string;
  note: string | null;
  status: string;
  createdAt: string;
  reporter: { id: string; displayName: string; email: string };
  review: Review;
}

@Injectable({ providedIn: 'root' })
export class AdminReviewsService {
  private readonly api = inject(ApiClientService);

  list(query: { page?: number; limit?: number; status?: string }): Observable<ApiListResult<Review>> {
    return this.api.getList<Review>('/admin/reviews', query);
  }

  updateStatus(id: string, status: string, moderationNote?: string): Observable<Review> {
    return this.api.patch<Review>(`/admin/reviews/${id}/status`, { status, moderationNote });
  }

  listReports(status?: string): Observable<ReviewReport[]> {
    return this.api.get<ReviewReport[]>('/admin/reviews/reports', status ? { status } : undefined);
  }

  resolveReport(id: string, status: 'ACTIONED' | 'DISMISSED'): Observable<unknown> {
    return this.api.patch(`/admin/reviews/reports/${id}`, { status });
  }
}
