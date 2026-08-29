import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ActionSheetController,
  IonButton,
  IonContent,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonSkeletonText,
} from '@ionic/angular';
import { Review, ReviewSummaryResponse } from '@dinescout/shared-types';
import { AuthService } from '../../core/services/auth.service';
import { ReviewsService } from '../../core/services/reviews.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { StarRatingComponent } from '../../shared/components/star-rating/star-rating.component';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';

type SortOption = 'most_relevant' | 'newest' | 'highest_rated' | 'lowest_rated';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonButton,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonSkeletonText,
    EmptyStateComponent,
    StarRatingComponent,
    TimeAgoPipe,
  ],
  templateUrl: './reviews.page.html',
  styleUrl: './reviews.page.scss',
})
export class ReviewsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly reviewsService = inject(ReviewsService);
  private readonly auth = inject(AuthService);
  private readonly actionSheetController = inject(ActionSheetController);

  restaurantId = '';
  readonly reviews = signal<Review[]>([]);
  readonly summary = signal<ReviewSummaryResponse | null>(null);
  readonly loading = signal(true);
  readonly sort = signal<SortOption>('most_relevant');

  ratingBars = [5, 4, 3, 2, 1] as const;

  ngOnInit(): void {
    this.restaurantId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.restaurantId) return;

    this.reviewsService.summary(this.restaurantId).subscribe((s) => this.summary.set(s));
    this.loadReviews();
  }

  private loadReviews(): void {
    this.loading.set(true);
    this.reviewsService
      .list(this.restaurantId, { page: 1, limit: 50, sort: this.sort() })
      .subscribe({
        next: (res) => {
          this.reviews.set(res.data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onSortChange(value: SortOption): void {
    this.sort.set(value);
    this.loadReviews();
  }

  barWidth(count: number): string {
    const total = this.summary()?.reviewCount ?? 0;
    return total === 0 ? '0%' : `${Math.round((count / total) * 100)}%`;
  }

  countFor(stars: number): number {
    const dist = this.summary()?.distribution;
    return dist ? (dist as unknown as Record<number, number>)[stars] ?? 0 : 0;
  }

  writeReview(): void {
    void this.router.navigate(['/restaurants', this.restaurantId, 'reviews', 'new']);
  }

  isMine(review: Review): boolean {
    return this.auth.currentUser()?.id === review.author.id;
  }

  async openActions(review: Review): Promise<void> {
    const buttons = this.isMine(review)
      ? [
          { text: 'Edit', handler: () => this.editReview() },
          { text: 'Delete', role: 'destructive', handler: () => this.deleteReview(review) },
          { text: 'Cancel', role: 'cancel' },
        ]
      : [
          { text: 'Report', role: 'destructive', handler: () => this.reportReview(review) },
          { text: 'Cancel', role: 'cancel' },
        ];

    const sheet = await this.actionSheetController.create({ buttons });
    await sheet.present();
  }

  private editReview(): void {
    void this.router.navigate(['/restaurants', this.restaurantId, 'reviews', 'new']);
  }

  private deleteReview(review: Review): void {
    this.reviewsService.remove(review.id).subscribe(() => {
      this.reviews.update((list) => list.filter((r) => r.id !== review.id));
    });
  }

  private reportReview(review: Review): void {
    this.reviewsService.report(review.id, 'OTHER').subscribe();
  }

  goBack(): void {
    this.location.back();
  }
}
