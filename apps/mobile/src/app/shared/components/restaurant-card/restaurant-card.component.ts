import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestaurantSummary } from '@dinescout/shared-types';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonIcon,
  IonSkeletonText,
} from '@ionic/angular';
import { StarRatingComponent } from '../star-rating/star-rating.component';

/**
 * The single reusable restaurant card used across Home, Search, Favorites
 * and AI chat results. Keeping one component means the "look" of a
 * restaurant only has to be designed once.
 */
@Component({
  selector: 'app-restaurant-card',
  standalone: true,
  imports: [CommonModule, IonCard, IonIcon, IonButton, IonBadge, IonSkeletonText, StarRatingComponent],
  templateUrl: './restaurant-card.component.html',
  styleUrl: './restaurant-card.component.scss',
})
export class RestaurantCardComponent {
  @Input({ required: true }) restaurant!: RestaurantSummary;
  @Input() loading = false;

  @Output() open = new EventEmitter<RestaurantSummary>();
  @Output() toggleFavorite = new EventEmitter<RestaurantSummary>();

  onOpen(): void {
    this.open.emit(this.restaurant);
  }

  onToggleFavorite(event: Event): void {
    event.stopPropagation();
    this.toggleFavorite.emit(this.restaurant);
  }
}
