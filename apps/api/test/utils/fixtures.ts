import { PrismaService } from '../../src/database/prisma.service';

let seq = 0;
function unique(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}`;
}

export async function ensureLookupData(prisma: PrismaService): Promise<void> {
  await prisma.cuisine.upsert({
    where: { slug: 'indian' },
    create: { slug: 'indian', name: 'Indian', emoji: '🍛' },
    update: {},
  });
  await prisma.cuisine.upsert({
    where: { slug: 'italian' },
    create: { slug: 'italian', name: 'Italian', emoji: '🍝' },
    update: {},
  });
  await prisma.dietaryOption.upsert({
    where: { slug: 'vegetarian' },
    create: { slug: 'vegetarian', label: 'Veg', emoji: '🥬' },
    update: {},
  });
  await prisma.dietaryOption.upsert({
    where: { slug: 'vegan' },
    create: { slug: 'vegan', label: 'Vegan', emoji: '🌱' },
    update: {},
  });
}

/** Creates one published restaurant with a small real menu, for tests that
 *  need a concrete restaurant to search/view/review/favorite. */
export async function createTestRestaurant(
  prisma: PrismaService,
  overrides: { cuisineSlug?: string; ratingAvg?: number; ratingCount?: number } = {},
) {
  await ensureLookupData(prisma);
  const cuisineSlug = overrides.cuisineSlug ?? 'indian';
  const cuisine = await prisma.cuisine.findUniqueOrThrow({ where: { slug: cuisineSlug } });
  const dietary = await prisma.dietaryOption.findUniqueOrThrow({ where: { slug: 'vegetarian' } });

  const name = `Test Restaurant ${unique('r')}`;
  const restaurant = await prisma.restaurant.create({
    data: {
      slug: unique('test-restaurant'),
      name,
      description: 'A restaurant created for automated tests.',
      address: '1 Test Street, Singapore',
      lat: 1.3521 + Math.random() * 0.01,
      lng: 103.8198 + Math.random() * 0.01,
      phone: '+65 61234567',
      website: 'https://example.test',
      priceRange: 'MODERATE',
      status: 'PUBLISHED',
      ratingAvg: overrides.ratingAvg ?? 0,
      ratingCount: overrides.ratingCount ?? 0,
      cuisines: { create: [{ cuisineId: cuisine.id }] },
      dietaryOptions: { create: [{ dietaryOptionId: dietary.id }] },
      photos: {
        create: [{ url: 'https://picsum.photos/seed/test/800/600', isPrimary: true, sortOrder: 0 }],
      },
      hours: {
        create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          dayOfWeek,
          opensAt: '00:00',
          closesAt: '23:59',
          isClosed: false,
        })),
      },
    },
  });

  const category = await prisma.menuCategory.create({
    data: { restaurantId: restaurant.id, name: 'Main Course', sortOrder: 0 },
  });
  const menuItem = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: category.id,
      name: 'Test Curry',
      description: 'A test dish.',
      price: 12.5,
      currency: 'SGD',
      isVegetarian: true,
      isPopular: true,
    },
  });

  return { restaurant, category, menuItem };
}
