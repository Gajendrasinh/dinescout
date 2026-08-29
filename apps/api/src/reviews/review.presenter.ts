import { Prisma } from '@prisma/client';
import { Review } from '@dinescout/shared-types';

export const reviewWithRelations = Prisma.validator<Prisma.ReviewDefaultArgs>()({
  include: {
    user: { select: { id: true, displayName: true, avatarUrl: true } },
    photos: true,
  },
});

export type ReviewWithRelations = Prisma.ReviewGetPayload<typeof reviewWithRelations>;

export function toReview(row: ReviewWithRelations): Review {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    author: {
      id: row.user.id,
      displayName: row.user.displayName,
      avatarUrl: row.user.avatarUrl,
    },
    rating: row.rating,
    title: row.title,
    comment: row.comment,
    photos: row.photos.map((p) => ({ id: p.id, url: p.url })),
    status: row.status as unknown as Review['status'],
    helpfulCount: row.helpfulCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    editedByAuthor: row.editedByAuthor,
  };
}
