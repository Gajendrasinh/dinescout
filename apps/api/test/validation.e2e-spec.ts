import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, uniqueEmail } from './utils/test-app';

describe('Validation & error envelope (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unknown properties on the request body (forbidNonWhitelisted)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail('whitelist'),
        password: 'Str0ngPass!',
        displayName: 'Whitelist Test',
        isAdmin: true, // not a real field on RegisterDto
      })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('rejects a missing required field', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: uniqueEmail('missing') })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('rejects an invalid email format', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'Str0ngPass!', displayName: 'Bad Email' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('never leaks a stack trace in an error response', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/restaurants/definitely-unknown-id')
      .expect(404);
    expect(JSON.stringify(res.body)).not.toMatch(/at\s+\S+\s+\(.*:\d+:\d+\)/);
    expect(res.body.error).not.toHaveProperty('stack');
  });

  it('rejects an out-of-range page/limit query parameter', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/restaurants')
      .query({ limit: 1000 })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});
