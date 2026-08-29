import { Injectable } from '@nestjs/common';
import { RestaurantSummary } from '@dinescout/shared-types';
import { ApiException } from '../common/errors/api.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { PrismaService } from '../database/prisma.service';
import { restaurantWithRelations, toRestaurantSummary } from '../restaurants/restaurant.presenter';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<RestaurantSummary[]> {
    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { restaurant: restaurantWithRelations },
    });

    return rows
      .filter((f) => !f.restaurant.deletedAt)
      .map((f) => toRestaurantSummary(f.restaurant, { isFavorite: true }));
  }

  async add(userId: string, restaurantId: string): Promise<void> {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, deletedAt: null },
      select: { id: true },
    });
    if (!restaurant) {
      throw ApiException.notFound(ErrorCode.RESTAURANT_NOT_FOUND, 'Restaurant not found');
    }

    // Idempotent: favoriting an already-favorited restaurant is a no-op
    // success, which matches optimistic-UI toggle semantics on the client.
    await this.prisma.favorite.upsert({
      where: { userId_restaurantId: { userId, restaurantId } },
      create: { userId, restaurantId },
      update: {},
    });
  }

  async remove(userId: string, restaurantId: string): Promise<void> {
    // deleteMany is idempotent by construction (0 rows affected is a
    // success, not an error) — no try/catch needed for the "already
    // removed" case.
    await this.prisma.favorite.deleteMany({ where: { userId, restaurantId } });
  }
}
