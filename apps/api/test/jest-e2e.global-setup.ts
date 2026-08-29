// Jest runs each e2e spec file in its own worker process, and several spec
// files independently need the same small set of lookup rows (cuisines,
// dietary options) to exist. Creating them lazily from within each worker
// races: two workers can both see "row doesn't exist yet" and both try to
// INSERT, and Prisma's upsert doesn't retry on the resulting unique-
// constraint violation. Seeding them once here, before any worker starts,
// avoids the race entirely — by the time workers run, upserts only ever
// hit the (safe, row-locked) update path.
import { PrismaClient } from '@prisma/client';

module.exports = async function globalSetup(): Promise<void> {
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ??
    'postgresql://dinescout:dinescout@localhost:5432/dinescout_test?schema=public';

  const prisma = new PrismaClient();
  try {
    // Start every e2e run from a clean slate. Without this, data created
    // by a previous run (or a previous file in the same run) accumulates
    // in the shared test database across runs, which eventually makes
    // order-sensitive assertions (e.g. "top N by rating") flaky.
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "users", "restaurants", "cuisines", "dietary_options" RESTART IDENTITY CASCADE;',
    );

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
  } finally {
    await prisma.$disconnect();
  }
};
