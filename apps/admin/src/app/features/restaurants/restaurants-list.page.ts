import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RestaurantSummary } from '@dinescout/shared-types';
import { AdminRestaurantsService } from '../../core/services/restaurants.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

interface RestaurantRow extends RestaurantSummary {
  status: string;
}

@Component({
  selector: 'admin-restaurants-list-page',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent],
  templateUrl: './restaurants-list.page.html',
})
export class RestaurantsListPage implements OnInit {
  private readonly restaurantsService = inject(AdminRestaurantsService);
  private readonly router = inject(Router);

  readonly rows = signal<RestaurantRow[]>([]);
  readonly loading = signal(true);
  readonly statusFilter = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.restaurantsService
      .list({ limit: 100, status: this.statusFilter() || undefined })
      .subscribe({
        next: (res) => {
          this.rows.set(res.data as RestaurantRow[]);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.load();
  }

  edit(id: string): void {
    void this.router.navigate(['/restaurants', id]);
  }

  create(): void {
    void this.router.navigate(['/restaurants', 'new']);
  }

  publish(id: string, event: Event): void {
    event.stopPropagation();
    this.restaurantsService.publish(id).subscribe(() => this.load());
  }

  unpublish(id: string, event: Event): void {
    event.stopPropagation();
    this.restaurantsService.unpublish(id).subscribe(() => this.load());
  }

  remove(id: string, event: Event): void {
    event.stopPropagation();
    if (!confirm('Delete this restaurant? This cannot be undone.')) return;
    this.restaurantsService.remove(id).subscribe(() => this.load());
  }
}
