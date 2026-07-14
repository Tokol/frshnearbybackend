import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet({ contentSecurityPolicy: process.env.NODE_ENV === 'production' }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:8001')
    .split(',').map((origin) => origin.trim());
  app.enableCors({ origin: origins, credentials: true });
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 4000), '0.0.0.0');
}
bootstrap();
