import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule, IonIcon],
  template: `
    <span class="ds-star-rating" role="img" [attr.aria-label]="ratingValue() + ' out of 5 stars'">
      <ion-icon name="star" aria-hidden="true"></ion-icon>
      <span class="ds-star-rating__value">{{ ratingValue().toFixed(1) }}</span>
    </span>
  `,
  styles: [
    `
      .ds-star-rating {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        color: var(--ds-color-accent);
        font-weight: var(--ds-font-weight-medium);
        font-size: var(--ds-font-size-sm);
      }
      .ds-star-rating__value {
        color: var(--ds-color-text);
      }
    `,
  ],
})
export class StarRatingComponent {
  private readonly ratingSignal = signal(0);
  readonly ratingValue = computed(() => this.ratingSignal());

  @Input({ required: true })
  set rating(value: number) {
    this.ratingSignal.set(value);
  }
}
