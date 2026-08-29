import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular';

/** Reusable empty/error/offline state block — one look for "nothing here"
 *  across search, favorites, reviews, and offline mode. */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, IonIcon, IonButton],
  template: `
    <div class="ds-empty" role="status">
      <ion-icon [name]="icon" aria-hidden="true"></ion-icon>
      <h3>{{ title }}</h3>
      @if (message) {
        <p class="ds-muted">{{ message }}</p>
      }
      @if (actionLabel) {
        <ion-button fill="outline" size="small" (click)="action.emit()">
          {{ actionLabel }}
        </ion-button>
      }
    </div>
  `,
  styles: [
    `
      .ds-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: var(--ds-space-2);
        padding: var(--ds-space-8) var(--ds-space-4);
        color: var(--ds-color-text-muted);
      }
      .ds-empty ion-icon {
        font-size: 48px;
        color: var(--ds-color-border);
      }
      .ds-empty h3 {
        margin: 0;
        color: var(--ds-color-text);
        font-size: var(--ds-font-size-md);
      }
    `,
  ],
})
export class EmptyStateComponent {
  @Input() icon = 'restaurant-outline';
  @Input({ required: true }) title!: string;
  @Input() message?: string;
  @Input() actionLabel?: string;
  @Output() action = new EventEmitter<void>();
}
