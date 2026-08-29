import { Inject, Injectable } from '@nestjs/common';
import { Prisma, ReviewReportStatus, ReviewStatus } from '@prisma/client';
import { RatingDistribution, Review, ReviewSummaryResponse } from '@dinescout/shared-types';
import { RedisService } from '../cache/redis.service';
import { AuditLogService } from '../common/audit/audit-log.service';
import { buildMeta } from '../common/dto/pagination.dto';
import { ApiException } from '../common/errors/api.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { PrismaService } from '../database/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { ReportReviewDto } from './dto/report-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { PROFANITY_FILTER, ProfanityFilter } from './providers/profanity-filter.provider';
import { SPAM_DETECTOR, SpamDetector } from './providers/spam-detector.provider';
import { reviewWithRelations, ReviewWithRelations, toReview } from './review.presenter';
import type { PaginatedResult } from '../restaurants/restaurants.service';

const REVIEW_RATE_LIMIT_MAX = 5;
const REVIEW_RATE_LIMIT_WINDOW_SECONDS = 60 * 60; // 1 hour
const REPORT_AUTO_FLAG_THRESHOLD = 3;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditLogService,
    @Inject(PROFANITY_FILTER) private readonly profanity: ProfanityFilter,
    @Inject(SPAM_DETECTOR) private readonly spam: SpamDetector,
  ) {}

  async list(restaurantId: string, query: QueryReviewsDto): Promise<PaginatedResult<Review>> {
    const where: Prisma.ReviewWhereInput = {
      restaurantId,
      status: ReviewStatus.PUBLISHED,
      deletedAt: null,
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        ...reviewWithRelations,
        orderBy: this.resolveOrderBy(query.sort),
        skip: query.skip,
        take: query.limit,
      }),
    ]);

    return {
      data: rows.map(toReview),
      meta: buildMeta(query.page, query.limit, total),
    };
  }

  async summary(restaurantId: string): Promise<ReviewSummaryResponse> {
    const rows = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { restaurantId, status: ReviewStatus.PUBLISHED, deletedAt: null },
      _count: { rating: true },
    });

    const distribution: RatingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let total = 0;
    let sum = 0;
    for (const row of rows) {
      const count = row._count.rating;
      distribution[row.rating as 1 | 2 | 3 | 4 | 5] = count;
      total += count;
      sum += row.rating * count;
    }

    return {
      averageRating: total > 0 ? Math.round((sum / total) * 10) / 10 : 0,
      reviewCount: total,
      distribution,
    };
  }

  async create(restaurantId: string, userId: string, dto: CreateReviewDto): Promise<Review> {
    await this.assertRestaurantExists(restaurantId);
    await this.assertWithinRateLimit(userId);

    const existing = await this.prisma.review.findUnique({
      where: { restaurantId_userId: { restaurantId, userId } },
    });
    if (existing) {
      throw ApiException.conflict(
        ErrorCode.REVIEW_ALREADY_EXISTS,
        'You have already reviewed this restaurant. Edit your existing review instead.',
      );
    }

    const status = await this.moderate(`${dto.title} ${dto.comment}`);

    const created = await this.prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          restaurantId,
          userId,
          rating: dto.rating,
          title: dto.title,
          comment: dto.comment,
          status,
          photos: dto.photoUrls ? { create: dto.photoUrls.map((url) => ({ url })) } : undefined,
        },
        ...reviewWithRelations,
      });

      await this.audit.record(
        {
          userId,
          action: 'review.created',
          entityType: 'review',
          entityId: review.id,
          metadata: { status },
        },
        tx,
      );

      if (status === ReviewStatus.PUBLISHED) {
        await this.recalculateRating(restaurantId, tx);
      }

      return review;
    });

    await this.redis.client.incr(this.rateLimitKey(userId));

    if (status !== ReviewStatus.PUBLISHED) {
      throw ApiException.conflict(
        ErrorCode.REVIEW_REJECTED,
        status === ReviewStatus.REMOVED
          ? 'This review could not be published because it contains disallowed content.'
          : 'This review was submitted for moderation and will appear once approved.',
      );
    }

    return toReview(created);
  }

  async update(reviewId: string, userId: string, dto: UpdateReviewDto): Promise<Review> {
    const existing = await this.findOwned(reviewId, userId);

    const nextText = `${dto.title ?? existing.title} ${dto.comment ?? existing.comment}`;
    const status = dto.title || dto.comment ? await this.moderate(nextText) : existing.status;

    const updated = await this.prisma.$transaction(async (tx) => {
      const review = await tx.review.update({
        where: { id: reviewId },
        data: {
          rating: dto.rating ?? existing.rating,
          title: dto.title ?? existing.title,
          comment: dto.comment ?? existing.comment,
          status,
          editedByAuthor: true,
          ...(dto.photoUrls
            ? {
                photos: {
                  deleteMany: {},
                  create: dto.photoUrls.map((url) => ({ url })),
                },
              }
            : {}),
        },
        ...reviewWithRelations,
      });

      await this.audit.record(
        { userId, action: 'review.updated', entityType: 'review', entityId: reviewId, metadata: { status } },
        tx,
      );
      await this.recalculateRating(existing.restaurantId, tx);
      return review;
    });

    return toReview(updated);
  }

  async remove(reviewId: string, actingUser: { id: string; isModerator: boolean }): Promise<void> {
    const existing = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!existing || existing.deletedAt) {
      throw ApiException.notFound(ErrorCode.REVIEW_NOT_FOUND, 'Review not found');
    }
    if (existing.userId !== actingUser.id && !actingUser.isModerator) {
      throw ApiException.forbidden(ErrorCode.FORBIDDEN, 'You can only delete your own review');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id: reviewId },
        data: { status: ReviewStatus.REMOVED, deletedAt: new Date() },
      });
      await this.audit.record(
        {
          userId: actingUser.id,
          action: 'review.removed',
          entityType: 'review',
          entityId: reviewId,
        },
        tx,
      );
      await this.recalculateRating(existing.restaurantId, tx);
    });
  }

  async report(reviewId: string, reporterId: string, dto: ReportReviewDto): Promise<void> {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review || review.deletedAt) {
      throw ApiException.notFound(ErrorCode.REVIEW_NOT_FOUND, 'Review not found');
    }

    await this.prisma.reviewReport.upsert({
      where: { reviewId_reporterId: { reviewId, reporterId } },
      create: { reviewId, reporterId, reason: dto.reason, note: dto.note },
      update: { reason: dto.reason, note: dto.note, status: ReviewReportStatus.OPEN },
    });

    const openReports = await this.prisma.reviewReport.count({
      where: { reviewId, status: ReviewReportStatus.OPEN },
    });

    if (openReports >= REPORT_AUTO_FLAG_THRESHOLD && review.status === ReviewStatus.PUBLISHED) {
      await this.prisma.$transaction(async (tx) => {
        await tx.review.update({ where: { id: reviewId }, data: { status: ReviewStatus.FLAGGED } });
        await this.audit.record(
          {
            action: 'review.auto_flagged',
            entityType: 'review',
            entityId: reviewId,
            metadata: { openReports },
          },
          tx,
        );
        await this.recalculateRating(review.restaurantId, tx);
      });
    }
  }

  private async findOwned(reviewId: string, userId: string): Promise<ReviewWithRelations> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      ...reviewWithRelations,
    });
    if (!review || review.deletedAt) {
      throw ApiException.notFound(ErrorCode.REVIEW_NOT_FOUND, 'Review not found');
    }
    if (review.userId !== userId) {
      throw ApiException.forbidden(ErrorCode.FORBIDDEN, 'You can only edit your own review');
    }
    return review;
  }

  private async moderate(text: string): Promise<ReviewStatus> {
    const [profanityResult, spamResult] = await Promise.all([
      this.profanity.check(text),
      this.spam.check(text),
    ]);

    if (profanityResult.isProfane) return ReviewStatus.REMOVED;
    if (spamResult.isSuspicious) return ReviewStatus.FLAGGED;
    return ReviewStatus.PUBLISHED;
  }

  private async assertRestaurantExists(restaurantId: string): Promise<void> {
    const found = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, deletedAt: null },
      select: { id: true },
    });
    if (!found) {
      throw ApiException.notFound(ErrorCode.RESTAURANT_NOT_FOUND, 'Restaurant not found');
    }
  }

  private rateLimitKey(userId: string): string {
    return `ratelimit:review:${userId}`;
  }

  private async assertWithinRateLimit(userId: string): Promise<void> {
    const key = this.rateLimitKey(userId);
    const current = await this.redis.client.get(key);
    const count = current ? Number(current) : 0;

    if (count >= REVIEW_RATE_LIMIT_MAX) {
      throw ApiException.tooManyRequests(
        ErrorCode.REVIEW_RATE_LIMITED,
        'You are submitting reviews too quickly. Please try again later.',
      );
    }

    if (count === 0) {
      await this.redis.client.set(key, '0', 'EX', REVIEW_RATE_LIMIT_WINDOW_SECONDS);
    }
  }

  private async recalculateRating(
    restaurantId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const aggregate = await tx.review.aggregate({
      where: { restaurantId, status: ReviewStatus.PUBLISHED, deletedAt: null },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await tx.restaurant.update({
      where: { id: restaurantId },
      data: {
        ratingAvg: aggregate._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : 0,
        ratingCount: aggregate._count.rating,
      },
    });
  }

  private resolveOrderBy(
    sort: QueryReviewsDto['sort'],
  ): Prisma.ReviewOrderByWithRelationInput | Prisma.ReviewOrderByWithRelationInput[] {
    switch (sort) {
      case 'newest':
        return { createdAt: 'desc' };
      case 'highest_rated':
        return [{ rating: 'desc' }, { createdAt: 'desc' }];
      case 'lowest_rated':
        return [{ rating: 'asc' }, { createdAt: 'desc' }];
      default:
        // "Most relevant": helpful votes first, then recency.
        return [{ helpfulCount: 'desc' }, { createdAt: 'desc' }];
    }
  }
}
