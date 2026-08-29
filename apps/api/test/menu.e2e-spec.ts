import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import { createTestRestaurant } from './utils/fixtures';
import { createTestApp } from './utils/test-app';

describe('Menu (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns categories and items for a restaurant menu', async () => {
    const { restaurant, menuItem } = await createTestRestaurant(prisma);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${restaurant.id}/menu`)
      .expect(200);

    expect(res.body.data.categories.length).toBeGreaterThan(0);
    expect(res.body.data.items.some((i: { id: string }) => i.id === menuItem.id)).toBe(true);
    const found = res.body.data.items.find((i: { id: string }) => i.id === menuItem.id);
    expect(found.price).toBe(12.5);
    expect(found.isVegetarian).toBe(true);
  });

  it('returns just the categories', async () => {
    const { restaurant } = await createTestRestaurant(prisma);
    const res = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${restaurant.id}/menu/categories`)
      .expect(200);
    expect(res.body.data[0].name).toBe('Main Course');
  });

  it('returns a single menu item by id', async () => {
    const { menuItem } = await createTestRestaurant(prisma);
    const res = await request(app.getHttpServer())
      .get(`/api/v1/menu-items/${menuItem.id}`)
      .expect(200);
    expect(res.body.data.name).toBe('Test Curry');
  });

  it('404s for a menu on an unknown restaurant', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/restaurants/unknown-id/menu')
      .expect(404);
    expect(res.body.error.code).toBe('RESTAURANT_NOT_FOUND');
  });

  it('404s for an unknown menu item', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/menu-items/unknown-id')
      .expect(404);
    expect(res.body.error.code).toBe('MENU_ITEM_NOT_FOUND');
  });
});
