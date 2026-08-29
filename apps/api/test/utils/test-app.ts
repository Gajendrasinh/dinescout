import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { PrismaService } from '../../src/database/prisma.service';

export async function createTestApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  const prisma = app.get(PrismaService);
  return { app, prisma };
}

let counter = 0;
/** Generates a unique email per call so parallel/repeated test runs never
 *  collide on the users.email unique constraint. */
export function uniqueEmail(prefix = 'e2e'): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@example.test`;
}

export interface TestUser {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

/** Registers a fresh user against the running test app and returns their
 *  tokens, for tests that need an authenticated caller. */
export async function registerTestUser(
  app: INestApplication,
  prefix = 'user',
): Promise<TestUser> {
  const email = uniqueEmail(prefix);
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, password: 'Str0ngPass!', displayName: `Test ${prefix}` })
    .expect(201);

  return {
    userId: res.body.data.user.id,
    email,
    accessToken: res.body.data.tokens.accessToken,
    refreshToken: res.body.data.tokens.refreshToken,
  };
}
