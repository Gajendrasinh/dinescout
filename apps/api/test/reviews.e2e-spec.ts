import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import { createTestRestaurant } from './utils/fixtures';
import { createTestApp, registerTestUser } from './utils/test-app';

describe('Reviews (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects creating a review without authentication', async () => {
    const { restaurant } = await createTestRestaurant(prisma);
    const res = await request(app.getHttpServer())
      .post(`/api/v1/restaurants/${restaurant.id}/reviews`)
      .send({ rating: 5, title: 'Great!', comment: 'Loved every bit of it, would go again.' })
      .expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('creates a review, publishes it, and updates the restaurant rating', async () => {
    const { restaurant } = await createTestRestaurant(prisma);
    const user = await registerTestUser(app, 'reviewer');

    const res = await request(app.getHttpServer())
      .post(`/api/v1/restaurants/${restaurant.id}/reviews`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ rating: 5, title: 'Great!', comment: 'Loved every bit of it, would go again.' })
      .expect(201);

    expect(res.body.data.status).toBe('PUBLISHED');
    expect(res.body.data.author.id).toBe(user.userId);

    const listRes = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${restaurant.id}/reviews`)
      .expect(200);
    expect(listRes.body.data.some((r: { id: string }) => r.id === res.body.data.id)).toBe(true);

    const summaryRes = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${restaurant.id}/reviews/summary`)
      .expect(200);
    expect(summaryRes.body.data.reviewCount).toBe(1);
    expect(summaryRes.body.data.averageRating).toBe(5);
  });

  it('rejects a second review from the same user for the same restaurant', async () => {
    const { restaurant } = await createTestRestaurant(prisma);
    const user = await registerTestUser(app, 'dupe-reviewer');

    await request(app.getHttpServer())
      .post(`/api/v1/restaurants/${restaurant.id}/reviews`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ rating: 4, title: 'Good', comment: 'Pretty solid meal overall, enjoyed it.' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/restaurants/${restaurant.id}/reviews`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ rating: 3, title: 'Again', comment: 'Trying to review the same place twice here.' })
      .expect(409);
    expect(res.body.error.code).toBe('REVIEW_ALREADY_EXISTS');
  });

  it('rejects an overtly profane review outright', async () => {
    const { restaurant } = await createTestRestaurant(prisma);
    const user = await registerTestUser(app, 'profane-reviewer');

    const res = await request(app.getHttpServer())
      .post(`/api/v1/restaurants/${restaurant.id}/reviews`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ rating: 1, title: 'Terrible', comment: 'This food was absolute shit, avoid it.' })
      .expect(409);
    expect(res.body.error.code).toBe('REVIEW_REJECTED');
  });

  it('rejects a review with a comment that is too short', async () => {
    const { restaurant } = await createTestRestaurant(prisma);
    const user = await registerTestUser(app, 'short-reviewer');

    const res = await request(app.getHttpServer())
      .post(`/api/v1/restaurants/${restaurant.id}/reviews`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ rating: 5, title: 'Hi', comment: 'ok' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('lets the author edit and delete their own review, and forbids others from deleting it', async () => {
    const { restaurant } = await createTestRestaurant(prisma);
    const author = await registerTestUser(app, 'editor');
    const stranger = await registerTestUser(app, 'stranger');

    const created = await request(app.getHttpServer())
      .post(`/api/v1/restaurants/${restaurant.id}/reviews`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ rating: 4, title: 'Nice', comment: 'A genuinely nice meal, will return soon.' })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/reviews/${created.body.data.id}`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ rating: 5 })
      .expect(200);
    expect(updated.body.data.rating).toBe(5);
    expect(updated.body.data.editedByAuthor).toBe(true);

    const forbidden = await request(app.getHttpServer())
      .delete(`/api/v1/reviews/${created.body.data.id}`)
      .set('Authorization', `Bearer ${stranger.accessToken}`)
      .expect(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');

    await request(app.getHttpServer())
      .delete(`/api/v1/reviews/${created.body.data.id}`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .expect(204);
  });

  it('allows reporting a review', async () => {
    const { restaurant } = await createTestRestaurant(prisma);
    const author = await registerTestUser(app, 'reported-author');
    const reporter = await registerTestUser(app, 'reporter');

    const created = await request(app.getHttpServer())
      .post(`/api/v1/restaurants/${restaurant.id}/reviews`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ rating: 5, title: 'Nice', comment: 'A totally normal, genuine review of the food.' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/reviews/${created.body.data.id}/report`)
      .set('Authorization', `Bearer ${reporter.accessToken}`)
      .send({ reason: 'SPAM' })
      .expect(204);
  });
});
