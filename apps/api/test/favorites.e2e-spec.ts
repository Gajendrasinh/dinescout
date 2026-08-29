import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import { createTestRestaurant } from './utils/fixtures';
import { createTestApp, registerTestUser } from './utils/test-app';

describe('Favorites (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/favorites').expect(401);
  });

  it('adds, lists, and removes a favorite, idempotently', async () => {
    const { restaurant } = await createTestRestaurant(prisma);
    const user = await registerTestUser(app, 'fav-user');
    const auth = { Authorization: `Bearer ${user.accessToken}` };

    await request(app.getHttpServer())
      .post(`/api/v1/favorites/${restaurant.id}`)
      .set(auth)
      .expect(204);

    // Favoriting again is a no-op success, not an error.
    await request(app.getHttpServer())
      .post(`/api/v1/favorites/${restaurant.id}`)
      .set(auth)
      .expect(204);

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/favorites')
      .set(auth)
      .expect(200);
    expect(listRes.body.data.some((r: { id: string }) => r.id === restaurant.id)).toBe(true);
    expect(listRes.body.data.find((r: { id: string }) => r.id === restaurant.id).isFavorite).toBe(
      true,
    );

    await request(app.getHttpServer())
      .delete(`/api/v1/favorites/${restaurant.id}`)
      .set(auth)
      .expect(204);

    // Removing again is also idempotent, not an error.
    await request(app.getHttpServer())
      .delete(`/api/v1/favorites/${restaurant.id}`)
      .set(auth)
      .expect(204);

    const afterRes = await request(app.getHttpServer())
      .get('/api/v1/favorites')
      .set(auth)
      .expect(200);
    expect(afterRes.body.data.some((r: { id: string }) => r.id === restaurant.id)).toBe(false);
  });

  it('reflects favorite status on the restaurant list/detail endpoints', async () => {
    const { restaurant } = await createTestRestaurant(prisma);
    const user = await registerTestUser(app, 'fav-detail-user');
    const auth = { Authorization: `Bearer ${user.accessToken}` };

    await request(app.getHttpServer())
      .post(`/api/v1/favorites/${restaurant.id}`)
      .set(auth)
      .expect(204);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${restaurant.id}`)
      .set(auth)
      .expect(200);
    expect(detail.body.data.isFavorite).toBe(true);

    const anonDetail = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${restaurant.id}`)
      .expect(200);
    expect(anonDetail.body.data.isFavorite).toBe(false);
  });
});
