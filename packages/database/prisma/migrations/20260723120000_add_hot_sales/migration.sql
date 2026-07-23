CREATE TYPE "HotSaleUnit" AS ENUM ('KILOGRAM', 'GRAM', 'LITRE', 'PIECE', 'BUNCH', 'BOX', 'DOZEN');
CREATE TYPE "HotSaleStatus" AS ENUM ('ACTIVE', 'PAUSED', 'SOLD_OUT', 'ARCHIVED');

CREATE TABLE "HotSale" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "productKey" TEXT NOT NULL,
  "variantKey" TEXT,
  "description" TEXT NOT NULL,
  "productionDetail" TEXT,
  "unit" "HotSaleUnit" NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "producedAt" TIMESTAMP(3),
  "availableAtFarm" BOOLEAN NOT NULL DEFAULT false,
  "status" "HotSaleStatus" NOT NULL DEFAULT 'ACTIVE',
  "imageName" TEXT NOT NULL,
  "imageMimeType" TEXT NOT NULL,
  "imageData" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HotSale_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HotSaleRekoRing" (
  "hotSaleId" TEXT NOT NULL,
  "rekoRingId" TEXT NOT NULL,
  CONSTRAINT "HotSaleRekoRing_pkey" PRIMARY KEY ("hotSaleId", "rekoRingId")
);

CREATE INDEX "HotSale_sellerId_status_createdAt_idx" ON "HotSale"("sellerId", "status", "createdAt");
CREATE INDEX "HotSale_status_createdAt_idx" ON "HotSale"("status", "createdAt");
CREATE INDEX "HotSaleRekoRing_rekoRingId_idx" ON "HotSaleRekoRing"("rekoRingId");

ALTER TABLE "HotSale" ADD CONSTRAINT "HotSale_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HotSaleRekoRing" ADD CONSTRAINT "HotSaleRekoRing_hotSaleId_fkey" FOREIGN KEY ("hotSaleId") REFERENCES "HotSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HotSaleRekoRing" ADD CONSTRAINT "HotSaleRekoRing_rekoRingId_fkey" FOREIGN KEY ("rekoRingId") REFERENCES "RekoRing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
