import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonIcon, IonSkeletonText, IonSegment, IonSegmentButton, IonLabel } from '@ionic/angular';
import { MenuCategory, MenuItem } from '@dinescout/shared-types';
import { MenuService, RestaurantMenu } from '../../core/services/menu.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonIcon,
    IonSkeletonText,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    EmptyStateComponent,
  ],
  templateUrl: './menu.page.html',
  styleUrl: './menu.page.scss',
})
export class MenuPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly menuService = inject(MenuService);

  readonly menu = signal<RestaurantMenu | null>(null);
  readonly loading = signal(true);
  readonly activeCategory = signal<string | null>(null);

  readonly itemsByCategory = computed(() => {
    const menu = this.menu();
    if (!menu) return new Map<string, MenuItem[]>();
    const map = new Map<string, MenuItem[]>();
    for (const category of menu.categories) map.set(category.id, []);
    for (const item of menu.items) {
      const list = map.get(item.categoryId) ?? [];
      list.push(item);
      map.set(item.categoryId, list);
    }
    return map;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.menuService.getMenu(id).subscribe({
      next: (menu) => {
        this.menu.set(menu);
        this.activeCategory.set(menu.categories[0]?.id ?? null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  itemsFor(category: MenuCategory): MenuItem[] {
    return this.itemsByCategory().get(category.id) ?? [];
  }

  scrollTo(categoryId: string): void {
    this.activeCategory.set(categoryId);
    document.getElementById(`menu-category-${categoryId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  goBack(): void {
    this.location.back();
  }
}
