ALTER TABLE "PushInstallation" ADD COLUMN "installationId" TEXT;
UPDATE "PushInstallation" SET "installationId" = "id" WHERE "installationId" IS NULL;
ALTER TABLE "PushInstallation" ALTER COLUMN "installationId" SET NOT NULL;
CREATE UNIQUE INDEX "PushInstallation_installationId_key" ON "PushInstallation"("installationId");
