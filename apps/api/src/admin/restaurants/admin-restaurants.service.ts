import { Injectable } from '@nestjs/common';
import { Prisma, RestaurantStatus } from '@prisma/client';
import { Restaurant, RestaurantSummary } from '@dinescout/shared-types';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { buildMeta, PaginationDto } from '../../common/dto/pagination.dto';
import { ApiException } from '../../common/errors/api.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { PrismaService } from '../../database/prisma.service';
import {
  priceRangeToDbEnum,
  restaurantWithRelations,
  toRestaurant,
  toRestaurantSummary,
} from '../../restaurants/restaurant.presenter';
import { UpsertRestaurantDto } from '../dto/upsert-restaurant.dto';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class AdminRestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  /** Admin listing includes drafts/unpublished restaurants and soft-deleted
   *  ones are still excluded (those are gone, not just hidden). Unlike the
   *  public RestaurantSummary, each row also carries `status` — the admin
   *  UI needs to show and filter by it. */
  async list(
    pagination: PaginationDto,
    status?: RestaurantStatus,
  ): Promise<{
    data: (RestaurantSummary & { status: RestaurantStatus })[];
    meta: ReturnType<typeof buildMeta>;
  }> {
    const where: Prisma.RestaurantWhereInput = { deletedAt: null, ...(status ? { status } : {}) };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.restaurant.count({ where }),
      this.prisma.restaurant.findMany({
        where,
        ...restaurantWithRelations,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
    ]);
    return {
      data: rows.map((r) => ({ ...toRestaurantSummary(r), status: r.status })),
      meta: buildMeta(pagination.page, pagination.limit, total),
    };
  }

  async getOne(id: string): Promise<Restaurant> {
    const row = await this.prisma.restaurant.findFirst({
      where: { id, deletedAt: null },
      ...restaurantWithRelations,
    });
    if (!row) throw ApiException.notFound(ErrorCode.RESTAURANT_NOT_FOUND, 'Restaurant not found');
    return toRestaurant(row);
  }

  async create(dto: UpsertRestaurantDto, actingUserId: string): Promise<Restaurant> {
    const cuisines = await this.prisma.cuisine.findMany({
      where: { slug: { in: dto.cuisineSlugs } },
    });
    if (cuisines.length !== dto.cuisineSlugs.length) {
      throw new ApiException(ErrorCode.VALIDATION_FAILED, 'One or more cuisine slugs are invalid', 400);
    }
    const dietary = dto.dietarySlugs?.length
      ? await this.prisma.dietaryOption.findMany({ where: { slug: { in: dto.dietarySlugs } } })
      : [];

    const priceRange = priceRangeToDbEnum(dto.priceRange);
    if (!priceRange) {
      throw new ApiException(ErrorCode.VALIDATION_FAILED, 'Invalid priceRange', 400);
    }

    const slug = `${slugify(dto.name)}-${Date.now().toString(36)}`;

    const created = await this.prisma.restaurant.create({
      data: {
        slug,
        name: dto.name,
        description: dto.description,
        address: dto.address,
        lat: dto.lat,
        lng: dto.lng,
        phone: dto.phone,
        website: dto.website,
        priceRange,
        status: RestaurantStatus.DRAFT,
        cuisines: { create: cuisines.map((c) => ({ cuisineId: c.id })) },
        dietaryOptions: { create: dietary.map((d) => ({ dietaryOptionId: d.id })) },
        photos: dto.photos?.length
          ? {
              create: dto.photos.map((p, i) => ({
                url: p.url,
                alt: p.alt,
                isPrimary: p.isPrimary ?? i === 0,
                sortOrder: i,
              })),
            }
          : undefined,
        hours: {
          create: (dto.hours ?? defaultHours()).map((h) => ({
            dayOfWeek: h.dayOfWeek,
            opensAt: h.opensAt,
            closesAt: h.closesAt,
            isClosed: h.isClosed ?? false,
          })),
        },
      },
      ...restaurantWithRelations,
    });

    await this.audit.record(
      { userId: actingUserId, action: 'restaurant.created', entityType: 'restaurant', entityId: created.id },
      this.prisma,
    );

    return toRestaurant(created);
  }

  async update(id: string, dto: UpsertRestaurantDto, actingUserId: string): Promise<Restaurant> {
    await this.getOne(id); // 404s if missing

    const cuisines = await this.prisma.cuisine.findMany({
      where: { slug: { in: dto.cuisineSlugs } },
    });
    const dietary = dto.dietarySlugs?.length
      ? await this.prisma.dietaryOption.findMany({ where: { slug: { in: dto.dietarySlugs } } })
      : [];
    const priceRange = priceRangeToDbEnum(dto.priceRange);
    if (!priceRange) {
      throw new ApiException(ErrorCode.VALIDATION_FAILED, 'Invalid priceRange', 400);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.restaurantCuisine.deleteMany({ where: { restaurantId: id } });
      await tx.restaurantDietaryOption.deleteMany({ where: { restaurantId: id } });
      if (dto.photos) await tx.restaurantPhoto.deleteMany({ where: { restaurantId: id } });
      if (dto.hours) await tx.restaurantHour.deleteMany({ where: { restaurantId: id } });

      return tx.restaurant.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          address: dto.address,
          lat: dto.lat,
          lng: dto.lng,
          phone: dto.phone,
          website: dto.website,
          priceRange,
          cuisines: { create: cuisines.map((c) => ({ cuisineId: c.id })) },
          dietaryOptions: { create: dietary.map((d) => ({ dietaryOptionId: d.id })) },
          ...(dto.photos
            ? {
                photos: {
                  create: dto.photos.map((p, i) => ({
                    url: p.url,
                    alt: p.alt,
                    isPrimary: p.isPrimary ?? i === 0,
                    sortOrder: i,
                  })),
                },
              }
            : {}),
          ...(dto.hours
            ? {
                hours: {
                  create: dto.hours.map((h) => ({
                    dayOfWeek: h.dayOfWeek,
                    opensAt: h.opensAt,
                    closesAt: h.closesAt,
                    isClosed: h.isClosed ?? false,
                  })),
                },
              }
            : {}),
        },
        ...restaurantWithRelations,
      });
    });

    await this.audit.record(
      { userId: actingUserId, action: 'restaurant.updated', entityType: 'restaurant', entityId: id },
      this.prisma,
    );

    return toRestaurant(updated);
  }

  async setStatus(
    id: string,
    status: RestaurantStatus,
    actingUserId: string,
  ): Promise<Restaurant> {
    await this.getOne(id);
    const updated = await this.prisma.restaurant.update({
      where: { id },
      data: { status },
      ...restaurantWithRelations,
    });
    await this.audit.record(
      {
        userId: actingUserId,
        action: status === RestaurantStatus.PUBLISHED ? 'restaurant.published' : 'restaurant.unpublished',
        entityType: 'restaurant',
        entityId: id,
      },
      this.prisma,
    );
    return toRestaurant(updated);
  }

  async remove(id: string, actingUserId: string): Promise<void> {
    await this.getOne(id);
    await this.prisma.restaurant.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record(
      { userId: actingUserId, action: 'restaurant.deleted', entityType: 'restaurant', entityId: id },
      this.prisma,
    );
  }
}

function defaultHours(): { dayOfWeek: number; opensAt: string; closesAt: string; isClosed?: boolean }[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    opensAt: '11:00',
    closesAt: '22:00',
    isClosed: false,
  }));
}
