import { Injectable } from '@nestjs/common';
import { Cuisine, DietaryOption } from '@dinescout/shared-types';
import { RedisService } from '../cache/redis.service';
import { PrismaService } from '../database/prisma.service';

const CACHE_KEY_CUISINES = 'lookup:cuisines';
const CACHE_KEY_DIETARY = 'lookup:dietary-options';
const CACHE_TTL_SECONDS = 3600; // lookup tables change rarely

@Injectable()
export class CuisinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async listCuisines(): Promise<Cuisine[]> {
    const cached = await this.redis.get<Cuisine[]>(CACHE_KEY_CUISINES);
    if (cached) return cached;

    const rows = await this.prisma.cuisine.findMany({ orderBy: { name: 'asc' } });
    const result = rows.map((r) => ({
      id: r.id,
      slug: r.slug as Cuisine['slug'],
      name: r.name,
      emoji: r.emoji,
    }));
    await this.redis.set(CACHE_KEY_CUISINES, result, CACHE_TTL_SECONDS);
    return result;
  }

  async listDietaryOptions(): Promise<DietaryOption[]> {
    const cached = await this.redis.get<DietaryOption[]>(CACHE_KEY_DIETARY);
    if (cached) return cached;

    const rows = await this.prisma.dietaryOption.findMany({ orderBy: { label: 'asc' } });
    const result = rows.map((r) => ({
      id: r.id,
      slug: r.slug as DietaryOption['slug'],
      label: r.label,
      emoji: r.emoji,
    }));
    await this.redis.set(CACHE_KEY_DIETARY, result, CACHE_TTL_SECONDS);
    return result;
  }
}
