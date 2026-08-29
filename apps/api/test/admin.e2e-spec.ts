import { INestApplication } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import { createTestRestaurant } from './utils/fixtures';
import { createTestApp, registerTestUser, TestUser } from './utils/test-app';

const TEST_PASSWORD = 'Str0ngPass!';

/** Promotes a test user's role in the DB, then re-logs-in — the role a
 *  JWT carries is baked in at issuance, so a token issued before the
 *  promotion still reflects the old role until it's refreshed. */
async function promoteAndReauth(
  app: INestApplication,
  prisma: PrismaService,
  user: TestUser,
  role: UserRole,
): Promise<TestUser> {
  await prisma.user.update({ where: { id: user.userId }, data: { role } });
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: user.email, password: TEST_PASSWORD })
    .expect(200);
  return { ...user, accessToken: res.body.data.tokens.accessToken };
}

describe('Admin (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a regular user from the admin dashboard', async () => {
    const user = await registerTestUser(app, 'plain-user');
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects an anonymous caller from the admin dashboard', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard')
      .expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns dashboard stats for an admin', async () => {
    let admin = await registerTestUser(app, 'dash-admin');
    admin = await promoteAndReauth(app, prisma, admin, UserRole.ADMIN);

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.data.restaurants).toEqual(
      expect.objectContaining({ total: expect.any(Number) }),
    );
    expect(res.body.data.reviews).toEqual(expect.objectContaining({ total: expect.any(Number) }));
  });

  it('creates a restaurant as DRAFT, then publishes it, then it appears in public search', async () => {
    let admin = await registerTestUser(app, 'restaurant-admin');
    admin = await promoteAndReauth(app, prisma, admin, UserRole.ADMIN);
    const auth = { Authorization: `Bearer ${admin.accessToken}` };

    const cuisine = await prisma.cuisine.upsert({
      where: { slug: 'indian' },
      create: { slug: 'indian', name: 'Indian', emoji: '🍛' },
      update: {},
    });

    const created = await request(app.getHttpServer())
      .post('/api/v1/admin/restaurants')
      .set(auth)
      .send({
        name: 'Admin Test Kitchen',
        description: 'Created via the admin e2e test suite for verification purposes.',
        address: '1 Admin Street, Singapore',
        lat: 1.3521,
        lng: 103.8198,
        priceRange: '$$',
        cuisineSlugs: [cuisine.slug],
      })
      .expect(201);

    expect(created.body.data.status).toBe('DRAFT');
    const id = created.body.data.id;

    // Not visible publicly yet — draft restaurants 404 on the public endpoint.
    await request(app.getHttpServer()).get(`/api/v1/restaurants/${id}`).expect(404);

    const published = await request(app.getHttpServer())
      .patch(`/api/v1/admin/restaurants/${id}/publish`)
      .set(auth)
      .expect(200);
    expect(published.body.data.status).toBe('PUBLISHED');

    const searchRes = await request(app.getHttpServer())
      .get('/api/v1/restaurants')
      .query({ search: 'Admin Test Kitchen' })
      .expect(200);
    expect(searchRes.body.data.some((r: { id: string }) => r.id === id)).toBe(true);
  });

  it('moderates a review: lists the queue and changes its status', async () => {
    const { restaurant } = await createTestRestaurant(prisma);
    const author = await registerTestUser(app, 'moderated-author');
    let moderator = await registerTestUser(app, 'moderator-user');
    moderator = await promoteAndReauth(app, prisma, moderator, UserRole.MODERATOR);

    const review = await request(app.getHttpServer())
      .post(`/api/v1/restaurants/${restaurant.id}/reviews`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ rating: 5, title: 'Nice', comment: 'A perfectly normal review of the food here.' })
      .expect(201);

    const queue = await request(app.getHttpServer())
      .get('/api/v1/admin/reviews')
      .query({ status: 'PUBLISHED' })
      .set('Authorization', `Bearer ${moderator.accessToken}`)
      .expect(200);
    expect(queue.body.data.some((r: { id: string }) => r.id === review.body.data.id)).toBe(true);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/admin/reviews/${review.body.data.id}/status`)
      .set('Authorization', `Bearer ${moderator.accessToken}`)
      .send({ status: 'REMOVED', moderationNote: 'Test removal' })
      .expect(200);
    expect(updated.body.data.status).toBe('REMOVED');

    const publicList = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${restaurant.id}/reviews`)
      .expect(200);
    expect(publicList.body.data.some((r: { id: string }) => r.id === review.body.data.id)).toBe(
      false,
    );
  });

  it('lists and resolves review reports', async () => {
    const { restaurant } = await createTestRestaurant(prisma);
    const author = await registerTestUser(app, 'reported-review-author');
    const reporter = await registerTestUser(app, 'report-filer');
    let admin = await registerTestUser(app, 'report-admin');
    admin = await promoteAndReauth(app, prisma, admin, UserRole.ADMIN);

    const review = await request(app.getHttpServer())
      .post(`/api/v1/restaurants/${restaurant.id}/reviews`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ rating: 3, title: 'Meh', comment: 'An entirely unremarkable dining experience here.' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/reviews/${review.body.data.id}/report`)
      .set('Authorization', `Bearer ${reporter.accessToken}`)
      .send({ reason: 'SPAM' })
      .expect(204);

    const reports = await request(app.getHttpServer())
      .get('/api/v1/admin/reviews/reports')
      .query({ status: 'OPEN' })
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    const report = reports.body.data.find(
      (r: { review: { id: string } }) => r.review.id === review.body.data.id,
    );
    expect(report).toBeDefined();

    const resolved = await request(app.getHttpServer())
      .patch(`/api/v1/admin/reviews/reports/${report.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ status: 'DISMISSED' })
      .expect(200);
    expect(resolved.body.data.status).toBe('DISMISSED');
  });

  it('lists users for an admin', async () => {
    let admin = await registerTestUser(app, 'users-admin');
    admin = await promoteAndReauth(app, prisma, admin, UserRole.ADMIN);

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(res.body.data.some((u: { id: string }) => u.id === admin.userId)).toBe(true);
  });
});
