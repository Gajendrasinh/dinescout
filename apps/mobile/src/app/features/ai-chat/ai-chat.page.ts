import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, IonInput } from '@ionic/angular';
import { AiMessage, AiRole, AnalyticsEvent, RestaurantSummary } from '@dinescout/shared-types';
import { AiService } from '../../core/services/ai.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { LocationService } from '../../core/services/location.service';
import { RestaurantCardComponent } from '../../shared/components/restaurant-card/restaurant-card.component';

interface ChatBubble {
  id: string;
  role: AiRole;
  content: string;
  rich?: AiMessage['rich'];
  failed?: boolean;
}

const DEFAULT_PROMPTS = ['Something healthy', 'Date night', 'Under $20', 'Vegetarian'];

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonInput, RestaurantCardComponent],
  templateUrl: './ai-chat.page.html',
  styleUrl: './ai-chat.page.scss',
})
export class AiChatPage implements OnInit {
  private readonly aiService = inject(AiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly locationService = inject(LocationService);
  private readonly favorites = inject(FavoritesService);
  private readonly analytics = inject(AnalyticsService);

  @ViewChild(IonContent) content?: IonContent;

  readonly messages = signal<ChatBubble[]>([]);
  readonly draft = signal('');
  readonly sending = signal(false);
  readonly suggestedPrompts = signal<string[]>(DEFAULT_PROMPTS);

  private conversationId?: string;
  private restaurantId?: string;
  private lastFailedMessage?: string;

  ngOnInit(): void {
    this.restaurantId = this.route.snapshot.queryParamMap.get('restaurantId') ?? undefined;
    this.analytics.track(AnalyticsEvent.AI_CHAT_STARTED, { restaurantId: this.restaurantId });

    this.messages.set([
      {
        id: 'welcome',
        role: AiRole.ASSISTANT,
        content: this.restaurantId
          ? 'Ask me anything about this restaurant — the menu, what to order, or what people say about it.'
          : "Hi! I'm DineScout AI. Tell me what you're craving, or pick a suggestion below.",
      },
    ]);
  }

  usePrompt(prompt: string): void {
    this.draft.set(prompt);
    void this.send();
  }

  async send(): Promise<void> {
    const text = this.draft().trim();
    if (!text || this.sending()) return;

    this.messages.update((list) => [...list, { id: crypto.randomUUID(), role: AiRole.USER, content: text }]);
    this.draft.set('');
    this.sending.set(true);
    this.lastFailedMessage = text;
    this.scrollToBottom();

    const coords = this.locationService.coordinates();

    this.aiService
      .chat({
        conversationId: this.conversationId,
        message: text,
        context: {
          restaurantId: this.restaurantId,
          lat: coords?.lat,
          lng: coords?.lng,
        },
      })
      .subscribe({
        next: (res) => {
          this.conversationId = res.conversationId;
          this.messages.update((list) => [
            ...list,
            { id: res.message.id, role: AiRole.ASSISTANT, content: res.message.content, rich: res.message.rich },
          ]);
          if (res.message.rich?.suggestedPrompts) {
            this.suggestedPrompts.set(res.message.rich.suggestedPrompts);
          }
          this.sending.set(false);
          this.lastFailedMessage = undefined;
          this.scrollToBottom();
        },
        error: () => {
          this.messages.update((list) => [
            ...list,
            {
              id: crypto.randomUUID(),
              role: AiRole.ASSISTANT,
              content: "Something went wrong reaching DineScout AI. Tap to retry.",
              failed: true,
            },
          ]);
          this.sending.set(false);
          this.scrollToBottom();
        },
      });
  }

  retry(): void {
    if (!this.lastFailedMessage) return;
    this.messages.update((list) => list.filter((m) => !m.failed));
    this.draft.set(this.lastFailedMessage);
    void this.send();
  }

  withFav(restaurant: RestaurantSummary): RestaurantSummary {
    return this.favorites.withFavoriteStatus(restaurant);
  }

  openRestaurant(restaurant: RestaurantSummary): void {
    this.analytics.track(AnalyticsEvent.AI_RECOMMENDATION_CLICKED, { restaurantId: restaurant.id });
    void this.router.navigate(['/restaurants', restaurant.id]);
  }

  async toggleFavorite(restaurant: RestaurantSummary): Promise<void> {
    await this.favorites.toggle(restaurant.id);
  }

  goBack(): void {
    this.location.back();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      void this.content?.scrollToBottom(300);
    }, 50);
  }
}
