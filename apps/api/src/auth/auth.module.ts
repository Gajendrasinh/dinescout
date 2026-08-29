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
    { provide: EMAIL_PROVIDER, useClass: ConsoleEmailProvider },
  ],
  exports: [OptionalAuthGuard, RequireAuthGuard, RolesGuard, TokenService],
})
export class AuthModule {}
