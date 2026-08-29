import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Review } from '@dinescout/shared-types';
import { AdminReviewsService } from '../../core/services/reviews.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'admin-reviews-queue-page',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent],
  templateUrl: './reviews-queue.page.html',
})
export class ReviewsQueuePage implements OnInit {
  private readonly reviewsService = inject(AdminReviewsService);

  readonly rows = signal<Review[]>([]);
  readonly loading = signal(true);
  readonly statusFilter = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.reviewsService.list({ limit: 100, status: this.statusFilter() || undefined }).subscribe({
      next: (res) => {
        this.rows.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.load();
  }

  setStatus(id: string, status: string): void {
    this.reviewsService.updateStatus(id, status).subscribe(() => this.load());
  }
}
