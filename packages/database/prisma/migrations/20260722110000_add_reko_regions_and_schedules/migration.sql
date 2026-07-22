CREATE TYPE "RekoScheduleFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY');

ALTER TABLE "RekoRing"
ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'FI',
ADD COLUMN "regionCode" TEXT,
ADD COLUMN "regionName" TEXT,
ADD COLUMN "municipalityCode" TEXT;

CREATE TABLE "RekoMeetingSchedule" (
    "id" TEXT NOT NULL,
    "rekoRingId" TEXT NOT NULL,
    "frequency" "RekoScheduleFrequency" NOT NULL DEFAULT 'WEEKLY',
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Helsinki',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RekoMeetingSchedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RekoMeetingSchedule_rekoRingId_key" ON "RekoMeetingSchedule"("rekoRingId");
ALTER TABLE "RekoMeetingSchedule" ADD CONSTRAINT "RekoMeetingSchedule_rekoRingId_fkey" FOREIGN KEY ("rekoRingId") REFERENCES "RekoRing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
