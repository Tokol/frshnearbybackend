CREATE TABLE "FarmFollow" (
  "consumerId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FarmFollow_pkey" PRIMARY KEY ("consumerId", "sellerId")
);
CREATE TABLE "FarmNotification" (
  "id" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FarmNotification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FarmFollow_sellerId_createdAt_idx" ON "FarmFollow"("sellerId", "createdAt");
CREATE INDEX "FarmNotification_recipientId_readAt_createdAt_idx" ON "FarmNotification"("recipientId", "readAt", "createdAt");
ALTER TABLE "FarmFollow" ADD CONSTRAINT "FarmFollow_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FarmFollow" ADD CONSTRAINT "FarmFollow_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FarmNotification" ADD CONSTRAINT "FarmNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FarmNotification" ADD CONSTRAINT "FarmNotification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
