-- Older test/onboarding accounts may contain the same number. Keep ownership
-- on the account saved most recently and return older duplicates to an
-- incomplete state so the owner can enter a different number.
WITH "rankedPhones" AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "phone"
      ORDER BY "updatedAt" DESC, "id" DESC
    ) AS "position"
  FROM "User"
  WHERE "phone" IS NOT NULL
)
UPDATE "User" AS "user"
SET "phone" = NULL
FROM "rankedPhones"
WHERE "user"."id" = "rankedPhones"."id"
  AND "rankedPhones"."position" > 1;

CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
