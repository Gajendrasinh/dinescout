import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/** A selectable pill chip — used for cuisine/dietary filters everywhere
 *  they appear (home carousel, search filter sheet, AI suggested prompts). */
@Component({
  selector: 'app-chip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="ds-chip"
      [class.ds-chip--selected]="selected"
      (click)="toggled.emit()"
      [attr.aria-pressed]="selected"
    >
      @if (emoji) {
        <span aria-hidden="true">{{ emoji }}</span>
      }
      {{ label }}
    </button>
  `,
  styles: [
    `
      .ds-chip {
        display: inline-flex;
        align-items: center;
        gap: var(--ds-space-1);
        padding: var(--ds-space-2) var(--ds-space-4);
        border-radius: var(--ds-radius-pill);
        border: 1px solid var(--ds-color-border);
        background: var(--ds-color-surface);
        color: var(--ds-color-text);
        font-size: var(--ds-font-size-sm);
        font-weight: var(--ds-font-weight-medium);
        min-height: var(--ds-touch-target);
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
      }
      .ds-chip--selected {
        background: var(--ds-color-primary);
        border-color: var(--ds-color-primary);
        color: var(--ds-color-text-inverse);
      }
    `,
  ],
})
export class ChipComponent {
  @Input({ required: true }) label!: string;
  @Input() emoji?: string;
  @Input() selected = false;
  @Output() toggled = new EventEmitter<void>();
}
