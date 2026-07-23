CREATE TYPE "HotSaleTranslationStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

ALTER TABLE "HotSale"
  ALTER COLUMN "productKey" DROP NOT NULL,
  ADD COLUMN "categoryKey" TEXT NOT NULL DEFAULT 'other',
  ADD COLUMN "originalLanguage" TEXT NOT NULL DEFAULT 'auto',
  ADD COLUMN "detectedLanguage" TEXT,
  ADD COLUMN "originalTitle" TEXT;

UPDATE "HotSale"
SET "originalTitle" = initcap(replace(COALESCE("variantKey", "productKey", 'Product'), '-', ' '));

ALTER TABLE "HotSale" ALTER COLUMN "originalTitle" SET NOT NULL;

CREATE TABLE "HotSaleTranslation" (
  "id" TEXT NOT NULL,
  "hotSaleId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "productionDetail" TEXT,
  "status" "HotSaleTranslationStatus" NOT NULL DEFAULT 'PENDING',
  "provider" TEXT,
  "model" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HotSaleTranslation_pkey" PRIMARY KEY ("id")
);

INSERT INTO "HotSaleTranslation" (
  "id", "hotSaleId", "locale", "title", "description", "productionDetail",
  "status", "provider", "model", "createdAt", "updatedAt"
)
SELECT
  'legacy-' || "id", "id", 'en', "originalTitle", "description", "productionDetail",
  'COMPLETED', 'LEGACY', 'catalog', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "HotSale";

CREATE UNIQUE INDEX "HotSaleTranslation_hotSaleId_locale_key" ON "HotSaleTranslation"("hotSaleId", "locale");
CREATE INDEX "HotSaleTranslation_locale_title_idx" ON "HotSaleTranslation"("locale", "title");
ALTER TABLE "HotSaleTranslation" ADD CONSTRAINT "HotSaleTranslation_hotSaleId_fkey"
  FOREIGN KEY ("hotSaleId") REFERENCES "HotSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
