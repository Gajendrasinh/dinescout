import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, uniqueEmail } from './utils/test-app';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a new user and returns a token pair', async () => {
    const email = uniqueEmail('register');
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Str0ngPass!', displayName: 'Test User' })
      .expect(201);

    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.displayName).toBe('Test User');
    expect(res.body.data.tokens.accessToken).toEqual(expect.any(String));
    expect(res.body.data.tokens.refreshToken).toEqual(expect.any(String));
  });

  it('rejects registering the same email twice', async () => {
    const email = uniqueEmail('dupe');
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Str0ngPass!', displayName: 'First' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Str0ngPass!', displayName: 'Second' })
      .expect(409);

    expect(res.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('rejects a weak password at the validation layer', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: uniqueEmail('weak'), password: 'weak', displayName: 'Weak Pw' })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('logs in with correct credentials and rejects incorrect ones', async () => {
    const email = uniqueEmail('login');
    const password = 'Str0ngPass!';
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, displayName: 'Login User' })
      .expect(201);

    const ok = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    expect(ok.body.data.tokens.accessToken).toEqual(expect.any(String));

    const bad = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword1' })
      .expect(401);
    expect(bad.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rotates refresh tokens and rejects a reused (already-rotated) token', async () => {
    const email = uniqueEmail('rotate');
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Str0ngPass!', displayName: 'Rotate User' })
      .expect(201);

    const firstRefreshToken = registerRes.body.data.tokens.refreshToken;

    const rotated = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstRefreshToken })
      .expect(200);
    expect(rotated.body.data.tokens.refreshToken).not.toBe(firstRefreshToken);

    // Reusing the original (now-rotated) refresh token must fail — this is
    // the stolen-token replay defence.
    const reuse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstRefreshToken })
      .expect(401);
    expect(reuse.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('logout revokes the refresh token', async () => {
    const email = uniqueEmail('logout');
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Str0ngPass!', displayName: 'Logout User' })
      .expect(201);

    const refreshToken = registerRes.body.data.tokens.refreshToken;
    await request(app.getHttpServer()).post('/api/v1/auth/logout').send({ refreshToken }).expect(204);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });

  it('forgot-password always returns a generic success message', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'definitely-not-registered@example.test' })
      .expect(200);
    expect(res.body.data.message).toContain('If that email is registered');
  });
});
