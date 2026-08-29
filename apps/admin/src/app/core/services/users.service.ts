import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService, ApiListResult } from './api-client.service';

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
  reviewCount: number;
  favoriteCount: number;
}

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly api = inject(ApiClientService);

  list(query: { page?: number; limit?: number }): Observable<ApiListResult<AdminUserRow>> {
    return this.api.getList<AdminUserRow>('/admin/users', query);
  }
}
