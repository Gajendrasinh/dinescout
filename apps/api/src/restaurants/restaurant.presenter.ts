import { Prisma, PriceRange as DbPriceRange } from '@prisma/client';
import { CuisineSlug, DietaryTag, PriceRange, Restaurant, RestaurantSummary } from '@dinescout/shared-types';
import { isOpenAt } from '../common/utils/geo';

export const restaurantWithRelations = Prisma.validator<Prisma.RestaurantDefaultArgs>()({
  include: {
    cuisines: { include: { cuisine: true } },
    dietaryOptions: { include: { dietaryOption: true } },
    photos: { orderBy: { sortOrder: 'asc' } },
    hours: true,
  },
});

export type RestaurantWithRelations = Prisma.RestaurantGetPayload<typeof restaurantWithRelations>;

function heroImage(row: RestaurantWithRelations): string {
  const primary = row.photos.find((p) => p.isPrimary) ?? row.photos[0];
  return primary?.url ?? '';
}

export function toRestaurantSummary(
  row: RestaurantWithRelations,
  opts: { distanceKm?: number | null; isFavorite?: boolean } = {},
): RestaurantSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    heroImageUrl: heroImage(row),
    rating: row.ratingAvg,
    reviewCount: row.ratingCount,
    cuisines: row.cuisines.map((rc) => ({
      id: rc.cuisine.id,
      slug: rc.cuisine.slug as CuisineSlug,
      name: rc.cuisine.name,
      emoji: rc.cuisine.emoji,
    })),
    dietaryOptions: row.dietaryOptions.map((rd) => ({
      id: rd.dietaryOption.id,
      slug: rd.dietaryOption.slug as DietaryTag,
      label: rd.dietaryOption.label,
      emoji: rd.dietaryOption.emoji,
    })),
    priceRange: mapPriceRange(row.priceRange),
    distanceKm: opts.distanceKm ?? null,
    isOpenNow: isOpenAt(row.hours, new Date()),
    isFavorite: opts.isFavorite ?? false,
  };
}

export function toRestaurant(
  row: RestaurantWithRelations,
  opts: { distanceKm?: number | null; isFavorite?: boolean; popularDishIds?: string[] } = {},
): Restaurant {
  return {
    ...toRestaurantSummary(row, opts),
    description: row.description,
    address: row.address,
    coordinates: { lat: row.lat, lng: row.lng },
    phone: row.phone,
    website: row.website,
    status: row.status as unknown as Restaurant['status'],
    photos: row.photos.map((p) => ({ id: p.id, url: p.url, alt: p.alt, isPrimary: p.isPrimary })),
    openingHours: row.hours
      .slice()
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      .map((h) => ({
        dayOfWeek: h.dayOfWeek,
        opensAt: h.opensAt,
        closesAt: h.closesAt,
        isClosed: h.isClosed,
      })),
    popularDishIds: opts.popularDishIds ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const PRICE_RANGE_MAP: Record<DbPriceRange, PriceRange> = {
  [DbPriceRange.BUDGET]: PriceRange.BUDGET,
  [DbPriceRange.MODERATE]: PriceRange.MODERATE,
  [DbPriceRange.UPSCALE]: PriceRange.UPSCALE,
  [DbPriceRange.FINE_DINING]: PriceRange.FINE_DINING,
};

function mapPriceRange(value: DbPriceRange): PriceRange {
  return PRICE_RANGE_MAP[value] ?? PriceRange.BUDGET;
}

export function priceRangeToDbEnum(value: string): DbPriceRange | undefined {
  const entry = (Object.entries(PRICE_RANGE_MAP) as [DbPriceRange, PriceRange][]).find(
    ([, symbol]) => symbol === value,
  );
  return entry?.[0];
}
