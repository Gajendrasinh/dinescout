import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppConfigService } from '../config/app-config.service';
import { AppConfigModule } from '../config/config.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OptionalAuthGuard } from './guards/optional-auth.guard';
import { RequireAuthGuard } from './guards/require-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ConsoleEmailProvider, EMAIL_PROVIDER } from './providers/email.provider';
import { SmtpEmailProvider } from './providers/smtp-email.provider';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './token.service';

@Module({
  imports: [
    AppConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        // No default signOptions.expiresIn here — TokenService always
        // passes an explicit numeric expiresIn (seconds) per sign() call.
        secret: config.jwtSecret,
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    JwtStrategy,
    OptionalAuthGuard,
    RequireAuthGuard,
    RolesGuard,
    ConsoleEmailProvider,
    SmtpEmailProvider,
    {
      // Same zero-credential-fallback pattern as AI_PROVIDER/MAP_PROVIDER
      // in ai.module.ts: SMTP_HOST unset -> ConsoleEmailProvider, so the
      // app runs with no email vendor credentials at all.
      provide: EMAIL_PROVIDER,
      inject: [AppConfigService, SmtpEmailProvider, ConsoleEmailProvider],
      useFactory: (
        config: AppConfigService,
        smtp: SmtpEmailProvider,
        console_: ConsoleEmailProvider,
      ) => (config.smtp ? smtp : console_),
    },
  ],
  exports: [OptionalAuthGuard, RequireAuthGuard, RolesGuard, TokenService],
})
export class AuthModule {}
