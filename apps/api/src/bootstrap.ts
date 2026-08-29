import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import { AppConfigService } from './config/app-config.service';

/**
 * Shared app configuration between the real bootstrap (main.ts) and e2e
 * tests, so tests exercise the exact same pipes/guards/prefix/versioning
 * behavior production traffic gets.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(AppConfigService);

  app.use(helmet({ contentSecurityPolicy: config.isProduction ? undefined : false }));

  app.enableCors({
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : false,
    credentials: true,
  });

  app.setGlobalPrefix(config.apiPrefix, { exclude: ['health', 'health/live', 'health/ready'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}
