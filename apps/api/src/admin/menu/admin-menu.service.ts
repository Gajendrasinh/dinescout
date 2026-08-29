import { Injectable } from '@nestjs/common';
import { MenuCategory, MenuItem } from '@dinescout/shared-types';
import { ApiException } from '../../common/errors/api.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { PrismaService } from '../../database/prisma.service';
import { toMenuCategory, toMenuItem } from '../../menu/menu.presenter';
import { UpsertMenuCategoryDto } from '../dto/upsert-menu-category.dto';
import { UpsertMenuItemDto } from '../dto/upsert-menu-item.dto';

@Injectable()
export class AdminMenuService {
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(restaurantId: string, dto: UpsertMenuCategoryDto): Promise<MenuCategory> {
    await this.assertRestaurantExists(restaurantId);
    const row = await this.prisma.menuCategory.create({
      data: { restaurantId, name: dto.name, sortOrder: dto.sortOrder ?? 0 },
    });
    return toMenuCategory(row);
  }

  async updateCategory(categoryId: string, dto: UpsertMenuCategoryDto): Promise<MenuCategory> {
    const row = await this.prisma.menuCategory
      .update({ where: { id: categoryId }, data: { name: dto.name, sortOrder: dto.sortOrder } })
      .catch(() => null);
    if (!row) throw ApiException.notFound(ErrorCode.NOT_FOUND, 'Menu category not found');
    return toMenuCategory(row);
  }

  async deleteCategory(categoryId: string): Promise<void> {
    await this.prisma.menuCategory.delete({ where: { id: categoryId } }).catch(() => undefined);
  }

  async createItem(restaurantId: string, dto: UpsertMenuItemDto): Promise<MenuItem> {
    await this.assertRestaurantExists(restaurantId);
    const row = await this.prisma.menuItem.create({
      data: {
        restaurantId,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        currency: dto.currency ?? 'SGD',
        imageUrl: dto.imageUrl,
        isVegetarian: dto.isVegetarian ?? false,
        isVegan: dto.isVegan ?? false,
        isSpicy: dto.isSpicy ?? false,
        isPopular: dto.isPopular ?? false,
        isAvailable: dto.isAvailable ?? true,
        allergens: dto.allergens ?? [],
      },
    });
    return toMenuItem(row);
  }

  async updateItem(itemId: string, dto: UpsertMenuItemDto): Promise<MenuItem> {
    const row = await this.prisma.menuItem
      .update({
        where: { id: itemId },
        data: {
          categoryId: dto.categoryId,
          name: dto.name,
          description: dto.description,
          price: dto.price,
          currency: dto.currency,
          imageUrl: dto.imageUrl,
          isVegetarian: dto.isVegetarian,
          isVegan: dto.isVegan,
          isSpicy: dto.isSpicy,
          isPopular: dto.isPopular,
          isAvailable: dto.isAvailable,
          allergens: dto.allergens,
        },
      })
      .catch(() => null);
    if (!row) throw ApiException.notFound(ErrorCode.MENU_ITEM_NOT_FOUND, 'Menu item not found');
    return toMenuItem(row);
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.prisma.menuItem.delete({ where: { id: itemId } }).catch(() => undefined);
  }

  private async assertRestaurantExists(restaurantId: string): Promise<void> {
    const found = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, deletedAt: null },
      select: { id: true },
    });
    if (!found) throw ApiException.notFound(ErrorCode.RESTAURANT_NOT_FOUND, 'Restaurant not found');
  }
}
