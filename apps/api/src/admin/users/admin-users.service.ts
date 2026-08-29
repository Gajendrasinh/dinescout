import { Injectable } from '@nestjs/common';
import { buildMeta, PaginationDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(pagination: PaginationDto) {
    const where = { deletedAt: null };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          createdAt: true,
          _count: { select: { reviews: true, favorites: true } },
        },
      }),
    ]);

    return {
      data: rows.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        reviewCount: u._count.reviews,
        favoriteCount: u._count.favorites,
      })),
      meta: buildMeta(pagination.page, pagination.limit, total),
    };
  }
}
