import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'admin-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stat-card">
      <span class="stat-card__label">{{ label }}</span>
      <span class="stat-card__value">{{ value }}</span>
    </div>
  `,
  styles: [
    `
      .stat-card {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .stat-card__label {
        font-size: 13px;
        color: #6b7280;
        font-weight: 500;
      }
      .stat-card__value {
        font-size: 28px;
        font-weight: 700;
        color: #111827;
      }
    `,
  ],
})
export class StatCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: number | string;
}
