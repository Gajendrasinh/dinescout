import { Injectable } from '@nestjs/common';
import { ReviewReportStatus, ReviewStatus, RestaurantStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface AdminDashboardStats {
  restaurants: { total: number; published: number; draft: number; unpublished: number };
  reviews: { total: number; pending: number; flagged: number; published: number; removed: number };
  users: { total: number };
  openReports: number;
}

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<AdminDashboardStats> {
    const [
      restaurantsTotal,
      published,
      draft,
      unpublished,
      reviewsTotal,
      pending,
      flagged,
      publishedReviews,
      removed,
      usersTotal,
      openReports,
    ] = await this.prisma.$transaction([
      this.prisma.restaurant.count({ where: { deletedAt: null } }),
      this.prisma.restaurant.count({ where: { deletedAt: null, status: RestaurantStatus.PUBLISHED } }),
      this.prisma.restaurant.count({ where: { deletedAt: null, status: RestaurantStatus.DRAFT } }),
      this.prisma.restaurant.count({ where: { deletedAt: null, status: RestaurantStatus.UNPUBLISHED } }),
      this.prisma.review.count(),
      this.prisma.review.count({ where: { status: ReviewStatus.PENDING } }),
      this.prisma.review.count({ where: { status: ReviewStatus.FLAGGED } }),
      this.prisma.review.count({ where: { status: ReviewStatus.PUBLISHED } }),
      this.prisma.review.count({ where: { status: ReviewStatus.REMOVED } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.reviewReport.count({ where: { status: ReviewReportStatus.OPEN } }),
    ]);

    return {
      restaurants: { total: restaurantsTotal, published, draft, unpublished },
      reviews: {
        total: reviewsTotal,
        pending,
        flagged,
        published: publishedReviews,
        removed,
      },
      users: { total: usersTotal },
      openReports,
    };
  }
}
