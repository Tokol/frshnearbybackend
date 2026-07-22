CREATE TABLE "RekoRing" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Finland',
    "municipality" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "postalCode" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RekoRing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RekoRing_country_municipality_name_key" ON "RekoRing"("country", "municipality", "name");
CREATE INDEX "RekoRing_country_municipality_active_idx" ON "RekoRing"("country", "municipality", "active");
