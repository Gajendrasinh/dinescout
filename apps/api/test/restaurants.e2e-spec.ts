import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import { createTestRestaurant } from './utils/fixtures';
import { createTestApp } from './utils/test-app';

describe('Restaurants (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists published restaurants with pagination meta', async () => {
    await createTestRestaurant(prisma, { cuisineSlug: 'indian' });
    await createTestRestaurant(prisma, { cuisineSlug: 'italian' });

    const res = await request(app.getHttpServer())
      .get('/api/v1/restaurants')
      .query({ page: 1, limit: 5 })
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toEqual(
      expect.objectContaining({ page: 1, limit: 5, total: expect.any(Number) }),
    );
  });

  it('filters by cuisine', async () => {
    const { restaurant } = await createTestRestaurant(prisma, { cuisineSlug: 'italian' });

    const res = await request(app.getHttpServer())
      .get('/api/v1/restaurants')
      .query({ cuisine: 'italian', limit: 50 })
      .expect(200);

    const ids = res.body.data.map((r: { id: string }) => r.id);
    expect(ids).toContain(restaurant.id);
    for (const r of res.body.data) {
      expect(r.cuisines.some((c: { slug: string }) => c.slug === 'italian')).toBe(true);
    }
  });

  it('filters by minimum rating', async () => {
    const highRated = await createTestRestaurant(prisma, { ratingAvg: 4.8, ratingCount: 10 });
    const lowRated = await createTestRestaurant(prisma, { ratingAvg: 2.0, ratingCount: 10 });

    const res = await request(app.getHttpServer())
      .get('/api/v1/restaurants')
      .query({ ratingMin: 4.5, limit: 100 })
      .expect(200);

    const ids = res.body.data.map((r: { id: string }) => r.id);
    expect(ids).toContain(highRated.restaurant.id);
    expect(ids).not.toContain(lowRated.restaurant.id);
  });

  it('returns a restaurant by id with full detail fields', async () => {
    const { restaurant } = await createTestRestaurant(prisma);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${restaurant.id}`)
      .expect(200);

    expect(res.body.data.id).toBe(restaurant.id);
    expect(res.body.data.address).toEqual(expect.any(String));
    expect(Array.isArray(res.body.data.openingHours)).toBe(true);
    expect(Array.isArray(res.body.data.photos)).toBe(true);
  });

  it('returns a restaurant by slug too', async () => {
    const { restaurant } = await createTestRestaurant(prisma);
    const res = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${restaurant.slug}`)
      .expect(200);
    expect(res.body.data.id).toBe(restaurant.id);
  });

  it('returns 404 with the standard error envelope for an unknown restaurant', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/restaurants/does-not-exist')
      .expect(404);

    expect(res.body).toEqual({
      error: { code: 'RESTAURANT_NOT_FOUND', message: expect.any(String) },
    });
  });
});
