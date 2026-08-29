import { Injectable } from '@nestjs/common';
import { Prisma, ReviewReportStatus, ReviewStatus } from '@prisma/client';
import { Review } from '@dinescout/shared-types';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { buildMeta, PaginationDto } from '../../common/dto/pagination.dto';
import { ApiException } from '../../common/errors/api.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { PrismaService } from '../../database/prisma.service';
import { reviewWithRelations, toReview } from '../../reviews/review.presenter';
import { UpdateReviewStatusDto } from '../dto/update-review-status.dto';
import { ResolveReportDto } from '../dto/resolve-report.dto';

@Injectable()
export class AdminReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(
    pagination: PaginationDto,
    status?: ReviewStatus,
  ): Promise<{ data: Review[]; meta: ReturnType<typeof buildMeta> }> {
    const where: Prisma.ReviewWhereInput = status ? { status } : {};
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        ...reviewWithRelations,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
    ]);
    return { data: rows.map(toReview), meta: buildMeta(pagination.page, pagination.limit, total) };
  }

  async updateStatus(
    reviewId: string,
    dto: UpdateReviewStatusDto,
    actingUserId: string,
  ): Promise<Review> {
    const existing = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!existing) throw ApiException.notFound(ErrorCode.REVIEW_NOT_FOUND, 'Review not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      const review = await tx.review.update({
        where: { id: reviewId },
        data: {
          status: dto.status,
          moderationNote: dto.moderationNote,
          deletedAt: dto.status === ReviewStatus.REMOVED ? new Date() : null,
        },
        ...reviewWithRelations,
      });

      await this.audit.record(
        {
          userId: actingUserId,
          action: 'review.moderated',
          entityType: 'review',
          entityId: reviewId,
          metadata: { from: existing.status, to: dto.status, note: dto.moderationNote },
        },
        tx,
      );

      const aggregate = await tx.review.aggregate({
        where: { restaurantId: existing.restaurantId, status: ReviewStatus.PUBLISHED, deletedAt: null },
        _avg: { rating: true },
        _count: { rating: true },
      });
      await tx.restaurant.update({
        where: { id: existing.restaurantId },
        data: {
          ratingAvg: aggregate._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : 0,
          ratingCount: aggregate._count.rating,
        },
      });

      return review;
    });

    return toReview(updated);
  }

  async listReports(status?: ReviewReportStatus) {
    const rows = await this.prisma.reviewReport.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        review: { ...reviewWithRelations },
        reporter: { select: { id: true, displayName: true, email: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      reason: r.reason,
      note: r.note,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      reporter: r.reporter,
      review: toReview(r.review),
    }));
  }

  async resolveReport(reportId: string, dto: ResolveReportDto, actingUserId: string) {
    const report = await this.prisma.reviewReport
      .update({ where: { id: reportId }, data: { status: dto.status, resolvedAt: new Date() } })
      .catch(() => null);
    if (!report) throw ApiException.notFound(ErrorCode.NOT_FOUND, 'Report not found');

    await this.audit.record(
      {
        userId: actingUserId,
        action: 'review_report.resolved',
        entityType: 'review_report',
        entityId: reportId,
        metadata: { status: dto.status },
      },
      this.prisma,
    );

    return report;
  }
}
