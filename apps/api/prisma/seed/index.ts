/* eslint-disable no-console */
import { PrismaClient, ReviewStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  CUISINES,
  DIETARY_OPTIONS,
  DISH_POOLS,
  NAME_PREFIXES,
  NAME_SUFFIXES,
  NEIGHBORHOODS,
  REVIEW_TEMPLATES,
} from './reference-data';

const prisma = new PrismaClient();

const RESTAURANT_COUNT = 50;
const DEMO_USER_COUNT = 15;
const DEMO_PASSWORD = 'Password123!';

const CATEGORY_ORDER = ['Popular', 'Starters', 'Main Course', 'Rice', 'Bread', 'Desserts', 'Drinks'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function jitter(value: number, amount: number): number {
  return value + (Math.random() * 2 - 1) * amount;
}

function slugify(text: string, suffix: string): string {
  return `${text}-${suffix}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function weightedPrice(): 'BUDGET' | 'MODERATE' | 'UPSCALE' | 'FINE_DINING' {
  const r = Math.random();
  if (r < 0.3) return 'BUDGET';
  if (r < 0.7) return 'MODERATE';
  if (r < 0.9) return 'UPSCALE';
  return 'FINE_DINING';
}

function allergensFor(name: string): string[] {
  const lower = name.toLowerCase();
  const allergens: string[] = [];
  if (/naan|bread|noodle|pasta|pizza|bao|dumpling|croissant|muffin/.test(lower)) allergens.push('Gluten');
  if (/cheese|paneer|butter|cream|milkshake|latte/.test(lower)) allergens.push('Dairy');
  if (/crab|prawn|shrimp|salmon|unagi|seafood/.test(lower)) allergens.push('Shellfish/Fish');
  if (/satay|peanut/.test(lower)) allergens.push('Peanuts');
  if (/egg/.test(lower)) allergens.push('Egg');
  return allergens;
}

async function main(): Promise<void> {
  console.log('Seeding DineScout demo data (Singapore)…');

  // ── Lookup tables ────────────────────────────────────────────────────
  const cuisineRows = await Promise.all(
    CUISINES.map((c) =>
      prisma.cuisine.upsert({ where: { slug: c.slug }, create: c, update: c }),
    ),
  );
  const dietaryRows = await Promise.all(
    DIETARY_OPTIONS.map((d) =>
      prisma.dietaryOption.upsert({ where: { slug: d.slug }, create: d, update: d }),
    ),
  );
  console.log(`  cuisines: ${cuisineRows.length}, dietary options: ${dietaryRows.length}`);

  // ── Users ────────────────────────────────────────────────────────────
  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@dinescout.app' },
    create: {
      email: 'admin@dinescout.app',
      passwordHash,
      displayName: 'DineScout Admin',
      role: 'ADMIN',
      isEmailVerified: true,
    },
    update: {},
  });
  const moderator = await prisma.user.upsert({
    where: { email: 'moderator@dinescout.app' },
    create: {
      email: 'moderator@dinescout.app',
      passwordHash,
      displayName: 'DineScout Moderator',
      role: 'MODERATOR',
      isEmailVerified: true,
    },
    update: {},
  });

  const demoUsers = [];
  for (let i = 1; i <= DEMO_USER_COUNT; i += 1) {
    const email = `diner${String(i).padStart(2, '0')}@dinescout.app`;
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        passwordHash,
        displayName: `Demo Diner ${i}`,
        role: 'USER',
        isEmailVerified: true,
      },
      update: {},
    });
    await prisma.userPreferences.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        favoriteCuisines: pickN(CUISINES.map((c) => c.slug), 3),
        dietaryPreferences: pickN(DIETARY_OPTIONS.map((d) => d.slug), 2),
        pricePreference: weightedPrice(),
        preferredDistanceKm: pick([1, 3, 5, 10]),
      },
      update: {},
    });
    demoUsers.push(user);
  }
  console.log(`  users: 1 admin, 1 moderator, ${demoUsers.length} demo diners`);

  // ── Restaurants + menus ─────────────────────────────────────────────
  let totalMenuItems = 0;
  const restaurantIds: string[] = [];

  for (let i = 0; i < RESTAURANT_COUNT; i += 1) {
    const cuisineDef = CUISINES[i % CUISINES.length];
    const neighborhood = pick(NEIGHBORHOODS);
    const includeCuisineInName = Math.random() < 0.4;
    const name = includeCuisineInName
      ? `${pick(NAME_PREFIXES)} ${cuisineDef.name} ${pick(NAME_SUFFIXES)}`
      : `${pick(NAME_PREFIXES)} ${pick(NAME_SUFFIXES)}`;
    const slug = slugify(name, String(i + 1));
    const pool = DISH_POOLS[cuisineDef.slug] ?? [];

    const hasVeg = pool.some((d) => d.veg);
    const hasVegan = pool.some((d) => d.vegan);
    const hasNonVeg = pool.some((d) => !d.veg);
    const hasSeafood = pool.some((d) => /crab|prawn|salmon|unagi|shrimp/i.test(d.name));
    const isHalal = Math.random() < 0.4 && cuisineDef.slug !== 'american'; // rough demo heuristic

    const dietarySlugs = [
      hasVeg ? 'vegetarian' : null,
      hasVegan ? 'vegan' : null,
      hasNonVeg ? 'non_vegetarian' : null,
      hasSeafood ? 'seafood' : null,
      isHalal ? 'halal' : null,
    ].filter((v): v is string => Boolean(v));

    const isCafeHours = cuisineDef.slug === 'cafe';
    const closedMonday = i % 5 === 0;

    const restaurant = await prisma.restaurant.create({
      data: {
        slug,
        name,
        description: `A ${cuisineDef.name.toLowerCase()} favorite in ${neighborhood.name}, known for generous portions and a warm neighborhood feel.`,
        address: `${10 + i} ${neighborhood.name} Road, Singapore`,
        lat: jitter(neighborhood.lat, 0.006),
        lng: jitter(neighborhood.lng, 0.006),
        phone: `+65 6${String(1000000 + i * 37).slice(0, 7)}`,
        website: `https://example.com/${slug}`,
        priceRange: weightedPrice(),
        status: 'PUBLISHED',
        cuisines: { create: [{ cuisineId: findCuisineId(cuisineRows, cuisineDef.slug) }] },
        dietaryOptions: {
          create: dietarySlugs.map((slug2) => ({ dietaryOptionId: findDietaryId(dietaryRows, slug2) })),
        },
        photos: {
          create: [0, 1, 2].map((n) => ({
            url: `https://picsum.photos/seed/${slug}-${n}/900/600`,
            alt: `${name} photo ${n + 1}`,
            isPrimary: n === 0,
            sortOrder: n,
          })),
        },
        hours: {
          create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
            dayOfWeek,
            opensAt: isCafeHours ? '07:30' : '11:00',
            closesAt: isCafeHours ? '18:00' : '22:00',
            isClosed: closedMonday && dayOfWeek === 1,
          })),
        },
      },
    });
    restaurantIds.push(restaurant.id);

    // Menu categories + items, derived from the cuisine's dish pool.
    const categoriesPresent = CATEGORY_ORDER.filter((cat) => pool.some((d) => d.category === cat));
    const categoryIdByName = new Map<string, string>();
    for (const [idx, catName] of categoriesPresent.entries()) {
      const category = await prisma.menuCategory.create({
        data: { restaurantId: restaurant.id, name: catName, sortOrder: idx },
      });
      categoryIdByName.set(catName, category.id);
    }

    for (const dish of pool) {
      await prisma.menuItem.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: categoryIdByName.get(dish.category)!,
          name: dish.name,
          description: `${dish.name}, a ${cuisineDef.name.toLowerCase()} favorite made fresh to order.`,
          price: dish.price,
          currency: 'SGD',
          imageUrl: `https://picsum.photos/seed/${slugify(dish.name, restaurant.id.slice(0, 6))}/600/400`,
          isVegetarian: Boolean(dish.veg),
          isVegan: Boolean(dish.vegan),
          isSpicy: Boolean(dish.spicy),
          isPopular: dish.category === 'Popular',
          allergens: allergensFor(dish.name),
        },
      });
      totalMenuItems += 1;
    }

    if ((i + 1) % 10 === 0) console.log(`  ...${i + 1}/${RESTAURANT_COUNT} restaurants seeded`);
  }
  console.log(`  restaurants: ${restaurantIds.length}, menu items: ${totalMenuItems}`);

  // ── Reviews ──────────────────────────────────────────────────────────
  let totalReviews = 0;
  const now = Date.now();

  for (const restaurantId of restaurantIds) {
    const reviewerCount = 10 + Math.floor(Math.random() * 3); // 10-12
    const reviewers = pickN(demoUsers, reviewerCount);

    for (const reviewer of reviewers) {
      const template = pick(REVIEW_TEMPLATES);
      const ratingJitter = Math.random() < 0.2 ? (Math.random() < 0.5 ? -1 : 1) : 0;
      const rating = Math.min(5, Math.max(1, template.ratingWeight + ratingJitter));
      const roll = Math.random();
      const status: ReviewStatus = roll < 0.92 ? 'PUBLISHED' : roll < 0.97 ? 'FLAGGED' : 'PENDING';
      const daysAgo = Math.floor(Math.random() * 180);

      await prisma.review.create({
        data: {
          restaurantId,
          userId: reviewer.id,
          rating,
          title: template.title,
          comment: template.comment,
          status,
          helpfulCount: Math.floor(Math.random() * 20),
          createdAt: new Date(now - daysAgo * 86_400_000),
        },
      });
      totalReviews += 1;
    }

    const aggregate = await prisma.review.aggregate({
      where: { restaurantId, status: 'PUBLISHED' },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        ratingAvg: aggregate._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : 0,
        ratingCount: aggregate._count.rating,
      },
    });
  }
  console.log(`  reviews: ${totalReviews}`);

  // ── A handful of favorites for demo users ───────────────────────────
  let totalFavorites = 0;
  for (const user of demoUsers) {
    const favCount = 2 + Math.floor(Math.random() * 3);
    for (const restaurantId of pickN(restaurantIds, favCount)) {
      await prisma.favorite.upsert({
        where: { userId_restaurantId: { userId: user.id, restaurantId } },
        create: { userId: user.id, restaurantId },
        update: {},
      });
      totalFavorites += 1;
    }
  }
  console.log(`  favorites: ${totalFavorites}`);

  console.log('\nDemo accounts (all use the same password):');
  console.log(`  admin@dinescout.app / ${DEMO_PASSWORD}`);
  console.log(`  moderator@dinescout.app / ${DEMO_PASSWORD}`);
  console.log(`  diner01@dinescout.app .. diner${String(DEMO_USER_COUNT).padStart(2, '0')}@dinescout.app / ${DEMO_PASSWORD}`);
  console.log(`\nSeeded users: ${demoUsers.length + 2} (incl. ${admin.email}, ${moderator.email})`);
  console.log('Seed complete.');
}

function findCuisineId(rows: { id: string; slug: string }[], slug: string): string {
  const found = rows.find((r) => r.slug === slug);
  if (!found) throw new Error(`Missing seeded cuisine: ${slug}`);
  return found.id;
}

function findDietaryId(rows: { id: string; slug: string }[], slug: string): string {
  const found = rows.find((r) => r.slug === slug);
  if (!found) throw new Error(`Missing seeded dietary option: ${slug}`);
  return found.id;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
