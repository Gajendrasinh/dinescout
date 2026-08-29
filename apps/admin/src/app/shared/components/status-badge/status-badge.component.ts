import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

const TONE_MAP: Record<string, 'neutral' | 'positive' | 'warning' | 'danger'> = {
  PUBLISHED: 'positive',
  DRAFT: 'neutral',
  UNPUBLISHED: 'neutral',
  PENDING: 'warning',
  FLAGGED: 'warning',
  REMOVED: 'danger',
  OPEN: 'warning',
  ACTIONED: 'positive',
  DISMISSED: 'neutral',
  ADMIN: 'positive',
  MODERATOR: 'warning',
  USER: 'neutral',
};

@Component({
  selector: 'admin-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="badge" [class]="'badge--' + tone()">{{ status() }}</span>`,
  styles: [
    `
      .badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.02em;
      }
      .badge--neutral {
        background: #f3f4f6;
        color: #374151;
      }
      .badge--positive {
        background: #dcfce7;
        color: #166534;
      }
      .badge--warning {
        background: #fef3c7;
        color: #92400e;
      }
      .badge--danger {
        background: #fee2e2;
        color: #991b1b;
      }
    `,
  ],
})
export class StatusBadgeComponent {
  private readonly statusSignal = signal('');
  readonly status = computed(() => this.statusSignal());
  readonly tone = computed(() => TONE_MAP[this.statusSignal()] ?? 'neutral');

  @Input({ required: true })
  set value(v: string) {
    this.statusSignal.set(v);
  }
}
