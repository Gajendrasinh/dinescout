import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminUserRow, AdminUsersService } from '../../core/services/users.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'admin-users-page',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  templateUrl: './users.page.html',
})
export class UsersPage implements OnInit {
  private readonly usersService = inject(AdminUsersService);

  readonly rows = signal<AdminUserRow[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.usersService.list({ limit: 100 }).subscribe({
      next: (res) => {
        this.rows.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
