import { Injectable } from '@nestjs/common';
import { MenuCategory, MenuItem } from '@dinescout/shared-types';
import { ApiException } from '../common/errors/api.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { PrismaService } from '../database/prisma.service';
import { toMenuCategory, toMenuItem } from './menu.presenter';

export interface MenuResponse {
  categories: MenuCategory[];
  items: MenuItem[];
}

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async getMenu(restaurantId: string): Promise<MenuResponse> {
    await this.assertRestaurantExists(restaurantId);

    const [categories, items] = await Promise.all([
      this.prisma.menuCategory.findMany({
        where: { restaurantId },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.menuItem.findMany({
        where: { restaurantId, isAvailable: true },
        orderBy: [{ isPopular: 'desc' }, { name: 'asc' }],
      }),
    ]);

    return {
      categories: categories.map(toMenuCategory),
      items: items.map(toMenuItem),
    };
  }

  async getCategories(restaurantId: string): Promise<MenuCategory[]> {
    await this.assertRestaurantExists(restaurantId);
    const rows = await this.prisma.menuCategory.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map(toMenuCategory);
  }

  async getMenuItem(id: string): Promise<MenuItem> {
    const row = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!row) {
      throw ApiException.notFound(ErrorCode.MENU_ITEM_NOT_FOUND, 'Menu item not found');
    }
    return toMenuItem(row);
  }

  private async assertRestaurantExists(restaurantId: string): Promise<void> {
    const found = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, deletedAt: null },
      select: { id: true },
    });
    if (!found) {
      throw ApiException.notFound(ErrorCode.RESTAURANT_NOT_FOUND, 'Restaurant not found');
    }
  }
}
