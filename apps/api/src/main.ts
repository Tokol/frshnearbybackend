import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(
    helmet({ contentSecurityPolicy: process.env.NODE_ENV === "production" }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const origins = (
    process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:8001"
  )
    .split(/[\n,]/)
    .map((origin) => origin.trim())
    .filter((origin) => origin && origin !== "CORS_ORIGINS");
  if (
    origins.length === 0 ||
    origins.some((origin) => {
      try {
        new URL(origin);
        return false;
      } catch {
        return true;
      }
    })
  ) {
    throw new Error("CORS_ORIGINS must contain comma-separated absolute URLs");
  }
  app.enableCors({ origin: origins, credentials: true });
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT must be a valid TCP port");
  await app.listen(port, "0.0.0.0");
}
bootstrap().catch((error: unknown) => {
  Logger.error(error instanceof Error ? error.stack : error, "Bootstrap");
  process.exitCode = 1;
});
