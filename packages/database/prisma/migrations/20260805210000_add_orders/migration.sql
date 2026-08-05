CREATE TYPE "OrderStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'REJECTED', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED');
CREATE TYPE "OrderPickupType" AS ENUM ('FARM', 'REKO');

CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "consumerId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'REQUESTED',
  "pickupType" "OrderPickupType" NOT NULL,
  "rekoRingId" TEXT,
  "pickupName" TEXT NOT NULL,
  "pickupAddress" TEXT NOT NULL,
  "pickupSchedule" TEXT,
  "farmName" TEXT NOT NULL,
  "consumerName" TEXT NOT NULL,
  "consumerEmail" TEXT,
  "consumerPhone" TEXT,
  "totalCents" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "readyAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "hotSaleId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "imageMimeType" TEXT NOT NULL,
  "imageData" BYTEA NOT NULL,
  "unit" TEXT NOT NULL,
  "quantityStep" DOUBLE PRECISION NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unitPriceCents" INTEGER NOT NULL,
  "lineTotalCents" INTEGER NOT NULL,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Order_consumerId_createdAt_idx" ON "Order"("consumerId", "createdAt");
CREATE INDEX "Order_sellerId_status_createdAt_idx" ON "Order"("sellerId", "status", "createdAt");
CREATE INDEX "Order_rekoRingId_idx" ON "Order"("rekoRingId");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_hotSaleId_idx" ON "OrderItem"("hotSaleId");

ALTER TABLE "Order" ADD CONSTRAINT "Order_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_rekoRingId_fkey" FOREIGN KEY ("rekoRingId") REFERENCES "RekoRing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_hotSaleId_fkey" FOREIGN KEY ("hotSaleId") REFERENCES "HotSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
