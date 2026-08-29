import { Injectable, inject } from '@angular/core';
import { MenuCategory, MenuItem } from '@dinescout/shared-types';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface RestaurantMenu {
  categories: MenuCategory[];
  items: MenuItem[];
}

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly api = inject(ApiClientService);

  getMenu(restaurantId: string): Observable<RestaurantMenu> {
    return this.api.get<RestaurantMenu>(`/restaurants/${restaurantId}/menu`);
  }

  getCategories(restaurantId: string): Observable<MenuCategory[]> {
    return this.api.get<MenuCategory[]>(`/restaurants/${restaurantId}/menu/categories`);
  }

  getItem(menuItemId: string): Observable<MenuItem> {
    return this.api.get<MenuItem>(`/menu-items/${menuItemId}`);
  }
}
