import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(AppConfigService);
  const logger = new Logger('Bootstrap');

  configureApp(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('DineScout API')
    .setDescription('Discover. Compare. Taste. — AI-powered restaurant discovery platform.')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth')
    .addTag('restaurants')
    .addTag('menu')
    .addTag('reviews')
    .addTag('favorites')
    .addTag('ai')
    .addTag('users')
    .addTag('health')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(config.port);
  logger.log(`DineScout API listening on port ${config.port}`);
  logger.log(`Swagger docs at http://localhost:${config.port}/api/docs`);
}

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap', error);
  process.exit(1);
});
