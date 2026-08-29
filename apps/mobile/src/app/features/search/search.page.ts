import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSearchbar,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { AnalyticsEvent, RestaurantSummary } from '@dinescout/shared-types';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AnalyticsService } from '../../core/services/analytics.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { OfflineCacheService } from '../../core/services/offline-cache.service';
import { RestaurantsService } from '../../core/services/restaurants.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { FilterSheetComponent } from '../../shared/components/filter-sheet/filter-sheet.component';
import { RestaurantCardComponent } from '../../shared/components/restaurant-card/restaurant-card.component';
import { countActiveFilters, EMPTY_FILTER_STATE, FilterState, filterStateToQuery } from '../../shared/models/filter-state';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonIcon,
    IonSpinner,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    EmptyStateComponent,
    RestaurantCardComponent,
  ],
  templateUrl: './search.page.html',
  styleUrl: './search.page.scss',
})
export class SearchPage implements OnInit {
  private readonly restaurantsService = inject(RestaurantsService);
  private readonly favorites = inject(FavoritesService);
  private readonly offlineCache = inject(OfflineCacheService);
  private readonly analytics = inject(AnalyticsService);
  private readonly modalController = inject(ModalController);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly query = signal('');
  readonly results = signal<RestaurantSummary[]>([]);
  readonly state = signal<LoadState>('idle');
  readonly page = signal(1);
  readonly hasMore = signal(true);
  readonly filters = signal<FilterState>({ ...EMPTY_FILTER_STATE });
  readonly activeFilterCount = signal(0);

  private readonly querySubject = new Subject<string>();

  ngOnInit(): void {
    this.querySubject.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => {
      this.runSearch(true);
    });

    const params = this.route.snapshot.queryParamMap;
    const cuisine = params.get('cuisine');
    const dietary = params.get('dietary');
    if (cuisine || dietary) {
      this.filters.update((f) => ({
        ...f,
        cuisines: cuisine ? [cuisine] : f.cuisines,
        dietary: dietary ? [dietary] : f.dietary,
      }));
      this.activeFilterCount.set(countActiveFilters(this.filters()));
    }

    this.runSearch(true);
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.querySubject.next(value);
  }

  async openFilters(): Promise<void> {
    const modal = await this.modalController.create({
      component: FilterSheetComponent,
      componentProps: { initialState: this.filters() },
      breakpoints: [0, 0.9],
      initialBreakpoint: 0.9,
    });
    await modal.present();
    const { data } = await modal.onWillDismiss<FilterState>();
    if (data) {
      this.filters.set(data);
      this.activeFilterCount.set(countActiveFilters(data));
      this.runSearch(true);
    }
  }

  onScrollEnd(event: CustomEvent): void {
    if (this.hasMore()) {
      this.runSearch(false);
    }
    (event.target as HTMLIonInfiniteScrollElement).complete();
  }

  private runSearch(reset: boolean): void {
    const page = reset ? 1 : this.page() + 1;
    this.state.set('loading');

    this.restaurantsService
      .search({
        search: this.query() || undefined,
        page,
        limit: 12,
        ...filterStateToQuery(this.filters()),
      })
      .subscribe({
        next: (res) => {
          this.results.set(reset ? res.data : [...this.results(), ...res.data]);
          this.page.set(page);
          this.hasMore.set(page < res.meta.totalPages);
          this.state.set('loaded');
          if (reset && this.query()) {
            void this.offlineCache.addRecentSearch(this.query());
            this.analytics.track(AnalyticsEvent.SEARCH_PERFORMED, {
              query: this.query(),
              resultCount: res.meta.total,
            });
          }
        },
        error: () => this.state.set('error'),
      });
  }

  withFav(restaurant: RestaurantSummary): RestaurantSummary {
    return this.favorites.withFavoriteStatus(restaurant);
  }

  openRestaurant(restaurant: RestaurantSummary): void {
    void this.router.navigate(['/restaurants', restaurant.id]);
  }

  async toggleFavorite(restaurant: RestaurantSummary): Promise<void> {
    await this.favorites.toggle(restaurant.id);
  }

  retry(): void {
    this.runSearch(true);
  }
}
