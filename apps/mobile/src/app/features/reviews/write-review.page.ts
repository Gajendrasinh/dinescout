import { Component, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonTextarea, IonInput, ToastController } from '@ionic/angular';
import { AnalyticsEvent } from '@dinescout/shared-types';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AppError } from '../../core/interceptors/error.interceptor';
import { ReviewsService } from '../../core/services/reviews.service';

@Component({
  selector: 'app-write-review',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonContent, IonButton, IonIcon, IonTextarea, IonInput],
  templateUrl: './write-review.page.html',
  styleUrl: './write-review.page.scss',
})
export class WriteReviewPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly fb = inject(FormBuilder);
  private readonly reviewsService = inject(ReviewsService);
  private readonly toastController = inject(ToastController);
  private readonly analytics = inject(AnalyticsService);

  readonly restaurantId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly submitting = signal(false);
  readonly stars = [1, 2, 3, 4, 5];

  readonly form = this.fb.nonNullable.group({
    rating: [0, [Validators.required, Validators.min(1)]],
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    comment: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
  });

  setRating(value: number): void {
    this.form.controls.rating.setValue(value);
  }

  goBack(): void {
    this.location.back();
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const value = this.form.getRawValue();

    this.reviewsService.create(this.restaurantId, value).subscribe({
      next: async () => {
        this.analytics.track(AnalyticsEvent.REVIEW_CREATED, { restaurantId: this.restaurantId });
        await this.showToast('Review published — thank you!', 'success');
        void this.router.navigate(['/restaurants', this.restaurantId, 'reviews']);
      },
      error: async (error: AppError) => {
        this.submitting.set(false);
        await this.showToast(error.message, 'danger');
      },
    });
  }

  private async showToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 3000, color });
    await toast.present();
  }
}
