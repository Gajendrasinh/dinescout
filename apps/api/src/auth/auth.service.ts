import { Inject, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { AppConfigService } from '../config/app-config.service';
import { ApiException } from '../common/errors/api.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EMAIL_PROVIDER, EmailProvider } from './providers/email.provider';
import { IssuedTokens, TokenService } from './token.service';
import { AuthenticatedUser } from './types/authenticated-user';

export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly config: AppConfigService,
    @Inject(EMAIL_PROVIDER) private readonly email: EmailProvider,
  ) {}

  async register(
    dto: RegisterDto,
    meta: RequestMeta,
  ): Promise<{ user: AuthenticatedUser; displayName: string; tokens: IssuedTokens }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw ApiException.conflict(
        ErrorCode.EMAIL_ALREADY_REGISTERED,
        'An account with this email already exists',
      );
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: this.config.argon2Options.memoryCost,
      timeCost: this.config.argon2Options.timeCost,
    });

    const created = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, displayName: dto.displayName },
    });

    await this.prisma.userPreferences.create({
      data: { userId: created.id, favoriteCuisines: [], dietaryPreferences: [] },
    });

    const user: AuthenticatedUser = { id: created.id, email: created.email, role: created.role };
    const tokens = await this.tokens.issueTokenPair(user, meta);
    return { user, displayName: created.displayName, tokens };
  }

  async login(
    dto: LoginDto,
    meta: RequestMeta,
  ): Promise<{ user: AuthenticatedUser; displayName: string; tokens: IssuedTokens }> {
    const found = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!found || found.deletedAt) {
      throw ApiException.unauthorized(ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    const valid = await argon2.verify(found.passwordHash, dto.password);
    if (!valid) {
      throw ApiException.unauthorized(ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    const user: AuthenticatedUser = { id: found.id, email: found.email, role: found.role };
    const tokens = await this.tokens.issueTokenPair(user, meta);
    return { user, displayName: found.displayName, tokens };
  }

  async refresh(refreshToken: string, meta: RequestMeta): Promise<IssuedTokens> {
    const rotated = await this.tokens.rotate(refreshToken, meta);
    if (!rotated) {
      throw ApiException.unauthorized(
        ErrorCode.INVALID_REFRESH_TOKEN,
        'Refresh token is invalid or has expired',
      );
    }
    return rotated;
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revokeFamily(refreshToken);
  }

  /** Always returns success regardless of whether the email exists, to avoid
   *  leaking which addresses are registered (user enumeration). */
  async forgotPassword(emailAddress: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: emailAddress } });
    if (!user) return;

    const rawToken = randomBytes(32).toString('base64url');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashOpaqueToken(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    await this.email.send({
      to: user.email,
      subject: 'Reset your DineScout password',
      body: `Use this token to reset your password: ${rawToken} (expires in 1 hour)`,
    });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = hashOpaqueToken(dto.token);
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw ApiException.unauthorized(
        ErrorCode.INVALID_REFRESH_TOKEN,
        'Reset token is invalid or has expired',
      );
    }

    const passwordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
      memoryCost: this.config.argon2Options.memoryCost,
      timeCost: this.config.argon2Options.timeCost,
    });

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Reset revokes all existing sessions — a stolen password shouldn't
      // leave old refresh tokens usable after the owner changes it.
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }
}
