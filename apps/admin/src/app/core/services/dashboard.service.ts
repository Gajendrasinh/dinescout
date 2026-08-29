import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface AdminDashboardStats {
  restaurants: { total: number; published: number; draft: number; unpublished: number };
  reviews: { total: number; pending: number; flagged: number; published: number; removed: number };
  users: { total: number };
  openReports: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiClientService);

  getStats(): Observable<AdminDashboardStats> {
    return this.api.get<AdminDashboardStats>('/admin/dashboard');
  }
}
