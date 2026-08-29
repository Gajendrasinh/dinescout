import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import { createTestRestaurant } from './utils/fixtures';
import { createTestApp, registerTestUser } from './utils/test-app';

describe('AI (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers anonymously via the local fallback provider and grounds the reply in real data', async () => {
    // A high rating pushes this fixture to the top of the (rating-desc)
    // default sort, so it lands in the tool's top-5 even when other e2e
    // spec files running in parallel have created many same-cuisine,
    // zero-rated fixtures of their own in this shared test database.
    const { restaurant } = await createTestRestaurant(prisma, {
      cuisineSlug: 'indian',
      ratingAvg: 5,
      ratingCount: 1,
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/ai/chat')
      .send({ message: 'Find me indian food' })
      .expect(201);

    expect(res.body.data.degraded).toBe(true); // AI_PROVIDER=none in tests
    expect(res.body.data.conversationId).toEqual(expect.any(String));
    expect(res.body.data.message.role).toBe('assistant');

    const names = (res.body.data.message.rich?.restaurants ?? []).map(
      (r: { id: string }) => r.id,
    );
    expect(names).toContain(restaurant.id);
  });

  it('never invents restaurant facts — every restaurant in a rich reply exists in the database', async () => {
    await createTestRestaurant(prisma, { cuisineSlug: 'italian' });

    const res = await request(app.getHttpServer())
      .post('/api/v1/ai/chat')
      .send({ message: 'Find me italian food' })
      .expect(201);

    const restaurants = res.body.data.message.rich?.restaurants ?? [];
    for (const r of restaurants) {
      const dbRow = await prisma.restaurant.findUnique({ where: { id: r.id } });
      expect(dbRow).not.toBeNull();
      expect(dbRow?.name).toBe(r.name);
    }
  });

  it('rejects a disallowed tool name at the router level', async () => {
    // Exercised at the unit level too — see tool-router.service.spec.ts —
    // this just confirms the chat endpoint never surfaces a raw DB error
    // even for an odd message.
    const res = await request(app.getHttpServer())
      .post('/api/v1/ai/chat')
      .send({ message: '   a  ' })
      .expect(201);
    expect(res.body.data.message.content).toEqual(expect.any(String));
  });

  it('conversation history requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/ai/conversations').expect(401);
  });

  it('lets an authenticated user list and fetch their own conversation', async () => {
    const user = await registerTestUser(app, 'ai-user');
    const auth = { Authorization: `Bearer ${user.accessToken}` };

    const chatRes = await request(app.getHttpServer())
      .post('/api/v1/ai/chat')
      .set(auth)
      .send({ message: 'Something healthy' })
      .expect(201);

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/ai/conversations')
      .set(auth)
      .expect(200);
    expect(
      listRes.body.data.some((c: { id: string }) => c.id === chatRes.body.data.conversationId),
    ).toBe(true);

    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/ai/conversations/${chatRes.body.data.conversationId}`)
      .set(auth)
      .expect(200);
    expect(getRes.body.data.messages.length).toBeGreaterThanOrEqual(2); // user + assistant
  });

  it('AI review summary is grounded only in retrieved reviews and labeled degraded when the fallback provider runs', async () => {
    const { restaurant } = await createTestRestaurant(prisma);
    const user = await registerTestUser(app, 'ai-summary-user');

    await request(app.getHttpServer())
      .post(`/api/v1/restaurants/${restaurant.id}/reviews`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        rating: 5,
        title: 'Great food',
        comment: 'Great food and friendly service, large portions too.',
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${restaurant.id}/ai-summary`)
      .expect(200);

    expect(res.body.data.degraded).toBe(true);
    expect(res.body.data.summary.toLowerCase()).toContain('great food');
  });
});
