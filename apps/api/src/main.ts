import {
  BadRequestException,
  Logger,
  ValidationError,
  ValidationPipe,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { json, static as serveStatic, urlencoded } from "express";
import helmet from "helmet";
import { basename, dirname, join, resolve } from "path";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const bodyLimit = process.env.REQUEST_BODY_LIMIT ?? "64mb";
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));
  const cwd = process.cwd();
  const repoRoot =
    basename(cwd) === "api" && basename(dirname(cwd)) === "apps"
      ? resolve(cwd, "..", "..")
      : cwd;
  const farmMediaRoot =
    process.env.FARM_MEDIA_DIR ?? join(repoRoot, "uploads", "farm-media");
  app.use(
    "/farm-media",
    serveStatic(farmMediaRoot, {
      immutable: true,
      maxAge: "1y",
      setHeaders: (response) => {
        response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("X-Content-Type-Options", "nosniff");
      },
    }),
  );
  app.use(
    helmet({ contentSecurityPolicy: process.env.NODE_ENV === "production" }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = errors.flatMap((error) =>
          Object.values(error.constraints ?? {}).map(
            (message) => `${error.property}: ${message}`,
          ),
        );
        return new BadRequestException(
          messages.join("; ") || "Invalid form data",
        );
      },
    }),
  );
  const defaultOrigins = [
    "http://localhost:3000",
    "http://localhost:8001",
    "https://frshnearby-admin.onrender.com",
    "https://tokol.github.io",
  ];
  const origins = (process.env.CORS_ORIGINS ?? defaultOrigins.join(","))
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
