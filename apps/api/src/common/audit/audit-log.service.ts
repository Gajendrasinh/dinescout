import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface AuditEntry {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

/** Append-only audit trail for moderation-relevant state changes
 *  (review status transitions, restaurant publish/unpublish, etc.). */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  async record(
    entry: AuditEntry,
    client: Prisma.TransactionClient | PrismaService,
  ): Promise<void> {
    try {
      await client.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          metadata: entry.metadata as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      // Audit logging must never break the primary operation.
      this.logger.error(`Failed to write audit log for ${entry.action}`, (error as Error).stack);
    }
  }
}
