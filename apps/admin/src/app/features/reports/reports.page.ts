import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminReviewsService, ReviewReport } from '../../core/services/reviews.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'admin-reports-page',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  templateUrl: './reports.page.html',
})
export class ReportsPage implements OnInit {
  private readonly reviewsService = inject(AdminReviewsService);

  readonly reports = signal<ReviewReport[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.reviewsService.listReports('OPEN').subscribe({
      next: (reports) => {
        this.reports.set(reports);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  resolve(id: string, status: 'ACTIONED' | 'DISMISSED'): void {
    this.reviewsService.resolveReport(id, status).subscribe(() => this.load());
  }

  removeReview(reviewId: string, reportId: string): void {
    this.reviewsService.updateStatus(reviewId, 'REMOVED').subscribe(() => {
      this.resolve(reportId, 'ACTIONED');
    });
  }
}
