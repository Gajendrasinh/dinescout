import { Injectable } from '@nestjs/common';
import { User, UserPreferences } from '@dinescout/shared-types';
import { priceRangeToDbEnum } from '../restaurants/restaurant.presenter';
import { ApiException } from '../common/errors/api.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { PrismaService } from '../database/prisma.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<User> {
    const row = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!row || row.deletedAt) {
      throw ApiException.notFound(ErrorCode.NOT_FOUND, 'User not found');
    }
    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      role: row.role as unknown as User['role'],
      createdAt: row.createdAt.toISOString(),
    };
  }

  async getPreferences(userId: string): Promise<UserPreferences> {
    const row = await this.prisma.userPreferences.findUnique({ where: { userId } });
    if (!row) {
      return {
        favoriteCuisines: [],
        dietaryPreferences: [],
        pricePreference: null,
        preferredDistanceKm: 5,
      };
    }
    return {
      favoriteCuisines: row.favoriteCuisines as UserPreferences['favoriteCuisines'],
      dietaryPreferences: row.dietaryPreferences as UserPreferences['dietaryPreferences'],
      pricePreference: row.pricePreference
        ? (priceRangeToSymbol(row.pricePreference) as UserPreferences['pricePreference'])
        : null,
      preferredDistanceKm: row.preferredDistanceKm,
    };
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<UserPreferences> {
    const dbPrice = dto.pricePreference ? priceRangeToDbEnum(dto.pricePreference) : undefined;

    await this.prisma.userPreferences.upsert({
      where: { userId },
      create: {
        userId,
        favoriteCuisines: dto.favoriteCuisines ?? [],
        dietaryPreferences: dto.dietaryPreferences ?? [],
        pricePreference: dbPrice,
        preferredDistanceKm: dto.preferredDistanceKm ?? 5,
      },
      update: {
        ...(dto.favoriteCuisines ? { favoriteCuisines: dto.favoriteCuisines } : {}),
        ...(dto.dietaryPreferences ? { dietaryPreferences: dto.dietaryPreferences } : {}),
        ...(dbPrice ? { pricePreference: dbPrice } : {}),
        ...(dto.preferredDistanceKm !== undefined
          ? { preferredDistanceKm: dto.preferredDistanceKm }
          : {}),
      },
    });

    return this.getPreferences(userId);
  }
}

function priceRangeToSymbol(dbValue: string): string {
  const map: Record<string, string> = {
    BUDGET: '$',
    MODERATE: '$$',
    UPSCALE: '$$$',
    FINE_DINING: '$$$$',
  };
  return map[dbValue] ?? '$';
}
