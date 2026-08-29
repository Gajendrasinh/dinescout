import { Injectable } from '@nestjs/common';
import { Prisma, RestaurantStatus } from '@prisma/client';
import { Restaurant, RestaurantSummary } from '@dinescout/shared-types';
import { buildMeta } from '../common/dto/pagination.dto';
import { ApiException } from '../common/errors/api.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { boundingBox, haversineDistanceKm, isOpenAt } from '../common/utils/geo';
import { PrismaService } from '../database/prisma.service';
import { QueryRestaurantsDto } from './dto/query-restaurants.dto';
import {
  priceRangeToDbEnum,
  restaurantWithRelations,
  RestaurantWithRelations,
  toRestaurant,
  toRestaurantSummary,
} from './restaurant.presenter';

export interface PaginatedResult<T> {
  data: T[];
  meta: ReturnType<typeof buildMeta>;
}

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    query: QueryRestaurantsDto,
    userId?: string,
  ): Promise<PaginatedResult<RestaurantSummary>> {
    const where: Prisma.RestaurantWhereInput = {
      status: RestaurantStatus.PUBLISHED,
      deletedAt: null,
    };

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { cuisines: { some: { cuisine: { name: { contains: search, mode: 'insensitive' } } } } },
        { menuItems: { some: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    if (query.cuisine) {
      const slugs = query.cuisine.split(',').map((s) => s.trim().toLowerCase());
      where.cuisines = { some: { cuisine: { slug: { in: slugs } } } };
    }

    if (query.dietary) {
      const slugs = query.dietary.split(',').map((s) => s.trim().toLowerCase());
      where.dietaryOptions = { some: { dietaryOption: { slug: { in: slugs } } } };
    }

    if (query.ratingMin !== undefined) {
      where.ratingAvg = { gte: query.ratingMin };
    }

    if (query.price) {
      const dbValue = priceRangeToDbEnum(query.price);
      if (dbValue) where.priceRange = dbValue;
    }

    const hasLocation = query.lat !== undefined && query.lng !== undefined;
    if (hasLocation && query.radius) {
      const box = boundingBox({ lat: query.lat!, lng: query.lng! }, query.radius);
      where.lat = { gte: box.minLat, lte: box.maxLat };
      where.lng = { gte: box.minLng, lte: box.maxLng };
    }

    const orderBy = this.resolveOrderBy(query.sort);

    // openNow and precise radius distance are computed in-process (hours
    // logic and haversine aren't cheaply expressible in SQL here), so for
    // those cases we overfetch a bounded window and filter/paginate in
    // memory. Keeps queries simple and correct without SELECT *-style waste
    // — the DB projection already excludes nothing unnecessary via `include`.
    const needsPostFilter = Boolean(query.openNow) || (hasLocation && Boolean(query.radius));

    if (!needsPostFilter) {
      const [total, rows] = await this.prisma.$transaction([
        this.prisma.restaurant.count({ where }),
        this.prisma.restaurant.findMany({
          where,
          ...restaurantWithRelations,
          orderBy,
          skip: query.skip,
          take: query.limit,
        }),
      ]);

      const favoriteIds = await this.favoriteIdSet(
        userId,
        rows.map((r) => r.id),
      );
      const data = rows.map((row) =>
        toRestaurantSummary(row, {
          distanceKm: hasLocation ? this.distanceTo(row, query) : null,
          isFavorite: favoriteIds.has(row.id),
        }),
      );
      return { data, meta: buildMeta(query.page, query.limit, total) };
    }

    const MAX_SCAN = 500;
    const rows = await this.prisma.restaurant.findMany({
      where,
      ...restaurantWithRelations,
      orderBy,
      take: MAX_SCAN,
    });

    let filtered = rows;
    if (query.openNow) {
      filtered = filtered.filter((r) => isOpenAt(r.hours, new Date()));
    }
    if (hasLocation && query.radius) {
      filtered = filtered.filter((r) => {
        const distance = haversineDistanceKm({ lat: query.lat!, lng: query.lng! }, r);
        return distance <= query.radius!;
      });
    }

    const total = filtered.length;
    const page = filtered.slice(query.skip, query.skip + query.limit);
    const favoriteIds = await this.favoriteIdSet(
      userId,
      page.map((r) => r.id),
    );

    const data = page.map((row) =>
      toRestaurantSummary(row, {
        distanceKm: hasLocation ? this.distanceTo(row, query) : null,
        isFavorite: favoriteIds.has(row.id),
      }),
    );

    return { data, meta: buildMeta(query.page, query.limit, total) };
  }

  async findOne(idOrSlug: string, userId?: string): Promise<Restaurant> {
    const row = await this.prisma.restaurant.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        deletedAt: null,
      },
      ...restaurantWithRelations,
    });

    if (!row) {
      throw ApiException.notFound(ErrorCode.RESTAURANT_NOT_FOUND, 'Restaurant not found');
    }

    const [isFavorite, popularDishes] = await Promise.all([
      userId ? this.isFavorite(userId, row.id) : Promise.resolve(false),
      this.prisma.menuItem.findMany({
        where: { restaurantId: row.id, isPopular: true, isAvailable: true },
        select: { id: true },
        take: 5,
      }),
    ]);

    return toRestaurant(row, {
      isFavorite,
      popularDishIds: popularDishes.map((d) => d.id),
    });
  }

  private resolveOrderBy(sort?: string): Prisma.RestaurantOrderByWithRelationInput {
    switch (sort) {
      case 'newest':
        return { createdAt: 'desc' };
      case 'popularity':
        return { ratingCount: 'desc' };
      case 'rating':
        return { ratingAvg: 'desc' };
      default:
        return { ratingAvg: 'desc' };
    }
  }

  private distanceTo(
    row: RestaurantWithRelations,
    query: { lat?: number; lng?: number },
  ): number | null {
    if (query.lat === undefined || query.lng === undefined) return null;
    return haversineDistanceKm({ lat: query.lat, lng: query.lng }, row);
  }

  private async favoriteIdSet(userId: string | undefined, ids: string[]): Promise<Set<string>> {
    if (!userId || ids.length === 0) return new Set();
    const rows = await this.prisma.favorite.findMany({
      where: { userId, restaurantId: { in: ids } },
      select: { restaurantId: true },
    });
    return new Set(rows.map((r) => r.restaurantId));
  }

  private async isFavorite(userId: string, restaurantId: string): Promise<boolean> {
    const found = await this.prisma.favorite.findUnique({
      where: { userId_restaurantId: { userId, restaurantId } },
    });
    return Boolean(found);
  }
}
