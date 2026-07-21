CREATE TYPE "PushPlatform" AS ENUM ('ANDROID', 'IOS', 'WEB', 'MACOS', 'OTHER');

CREATE TABLE "PushInstallation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "PushPlatform" NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PushInstallation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushInstallation_token_key" ON "PushInstallation"("token");
CREATE INDEX "PushInstallation_userId_enabled_idx" ON "PushInstallation"("userId", "enabled");
CREATE INDEX "PushInstallation_lastSeenAt_idx" ON "PushInstallation"("lastSeenAt");
ALTER TABLE "PushInstallation" ADD CONSTRAINT "PushInstallation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
