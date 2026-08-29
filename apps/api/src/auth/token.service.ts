import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { AppConfigService } from '../config/app-config.service';
import { parseDurationSeconds } from '../common/utils/duration';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser, JwtPayload } from './types/authenticated-user';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Issues short-lived JWT access tokens and long-lived, rotating, DB-backed
 * refresh tokens. Refresh tokens are stored only as a SHA-256 hash — the
 * plaintext value only ever exists in the response body and the client.
 * Reuse of an already-rotated refresh token revokes its entire family,
 * which is the standard defence against a stolen refresh token being
 * replayed after the legitimate client has already rotated past it.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async issueTokenPair(
    user: AuthenticatedUser,
    meta: { userAgent?: string; ipAddress?: string },
    family = randomBytes(16).toString('hex'),
  ): Promise<IssuedTokens> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessTokenTtlSeconds = parseDurationSeconds(this.config.jwtExpiresIn);
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.jwtSecret,
      expiresIn: accessTokenTtlSeconds,
    });

    const refreshToken = randomBytes(48).toString('base64url');
    const refreshTtlSeconds = parseDurationSeconds(this.config.jwtRefreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        family,
        expiresAt: new Date(Date.now() + refreshTtlSeconds * 1000),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTokenTtlSeconds,
    };
  }

  /** Verifies + rotates a refresh token. Returns the new pair, or null if invalid. */
  async rotate(
    refreshToken: string,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<IssuedTokens | null> {
    const tokenHash = hashToken(refreshToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record) return null;

    if (record.revokedAt || record.expiresAt < new Date()) {
      // Reuse of a rotated/expired token: treat as compromise, kill the family.
      await this.prisma.refreshToken.updateMany({
        where: { family: record.family, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return null;
    }

    const user: AuthenticatedUser = {
      id: record.user.id,
      email: record.user.email,
      role: record.user.role,
    };

    const newTokens = await this.issueTokenPair(user, meta, record.family);

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: {
        revokedAt: new Date(),
        replacedByTokenHash: hashToken(newTokens.refreshToken),
      },
    });

    return newTokens;
  }

  async revokeFamily(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!record) return;
    await this.prisma.refreshToken.updateMany({
      where: { family: record.family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
