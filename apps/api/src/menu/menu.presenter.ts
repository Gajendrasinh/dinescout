import { MenuCategory as PrismaMenuCategory, MenuItem as PrismaMenuItem } from '@prisma/client';
import { MenuCategory, MenuItem } from '@dinescout/shared-types';

export function toMenuCategory(row: PrismaMenuCategory): MenuCategory {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    name: row.name,
    sortOrder: row.sortOrder,
  };
}

export function toMenuItem(row: PrismaMenuItem): MenuItem {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    categoryId: row.categoryId,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    currency: row.currency,
    imageUrl: row.imageUrl,
    isVegetarian: row.isVegetarian,
    isVegan: row.isVegan,
    isSpicy: row.isSpicy,
    isPopular: row.isPopular,
    isAvailable: row.isAvailable,
    allergens: row.allergens,
  };
}
