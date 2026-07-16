CREATE TABLE "EmailSignupVerification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firebaseUid" TEXT,
    "displayName" TEXT,
    "codeHash" TEXT NOT NULL,
    "codeSalt" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resendAvailableAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSignupVerification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailSignupVerification_email_key" ON "EmailSignupVerification"("email");
CREATE INDEX "EmailSignupVerification_expiresAt_idx" ON "EmailSignupVerification"("expiresAt");
