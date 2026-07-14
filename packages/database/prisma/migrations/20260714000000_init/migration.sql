-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CONSUMER', 'SIDE_HUSTLER', 'BUSINESS', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETION_PENDING', 'DELETED');
CREATE TYPE "OnboardingStep" AS ENUM ('ACCOUNT_CREATED', 'EMAIL_VERIFICATION_REQUIRED', 'PROFILE_REQUIRED', 'ROLE_SELECTION_REQUIRED', 'PRODUCER_DETAILS_REQUIRED', 'BUSINESS_DETAILS_REQUIRED', 'SUBMITTED_FOR_REVIEW', 'COMPLETE');
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_REQUIRED', 'DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEEDS_CHANGES', 'VERIFIED', 'REJECTED');
CREATE TYPE "VerificationKind" AS ENUM ('SIDE_HUSTLER', 'BUSINESS');
CREATE TYPE "DocumentKind" AS ENUM ('IDENTITY', 'BUSINESS_REGISTRATION', 'VAT_REGISTRATION', 'ADDRESS_PROOF', 'OTHER');

CREATE TABLE "User" ("id" TEXT PRIMARY KEY, "firebaseUid" TEXT NOT NULL, "email" TEXT, "emailVerified" BOOLEAN NOT NULL DEFAULT false, "displayName" TEXT, "phone" TEXT, "dateOfBirth" TIMESTAMP(3), "photoUrl" TEXT, "roles" "UserRole"[] DEFAULT ARRAY['CONSUMER']::"UserRole"[], "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE', "onboardingStep" "OnboardingStep" NOT NULL DEFAULT 'ACCOUNT_CREATED', "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_REQUIRED', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "User_verificationStatus_idx" ON "User"("verificationStatus");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

CREATE TABLE "ProducerProfile" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "publicName" TEXT NOT NULL, "description" TEXT, "productionType" TEXT, "address" TEXT, "city" TEXT, "postalCode" TEXT, "country" TEXT);
CREATE UNIQUE INDEX "ProducerProfile_userId_key" ON "ProducerProfile"("userId");
ALTER TABLE "ProducerProfile" ADD CONSTRAINT "ProducerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

CREATE TABLE "BusinessProfile" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "publicDisplayName" TEXT NOT NULL, "legalBusinessName" TEXT NOT NULL, "farmName" TEXT, "businessId" TEXT NOT NULL, "vatNumber" TEXT, "businessType" TEXT NOT NULL, "businessAddress" TEXT NOT NULL, "city" TEXT NOT NULL, "postalCode" TEXT NOT NULL, "country" TEXT NOT NULL, "logoUrl" TEXT);
CREATE UNIQUE INDEX "BusinessProfile_userId_key" ON "BusinessProfile"("userId");
CREATE INDEX "BusinessProfile_businessId_idx" ON "BusinessProfile"("businessId");
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

CREATE TABLE "VerificationSubmission" ("id" TEXT PRIMARY KEY, "applicantId" TEXT NOT NULL, "kind" "VerificationKind" NOT NULL, "status" "VerificationStatus" NOT NULL DEFAULT 'SUBMITTED', "userMessage" TEXT, "internalNotes" TEXT, "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "reviewedAt" TIMESTAMP(3), "reviewedById" TEXT);
CREATE INDEX "VerificationSubmission_status_submittedAt_idx" ON "VerificationSubmission"("status", "submittedAt");
CREATE INDEX "VerificationSubmission_applicantId_idx" ON "VerificationSubmission"("applicantId");
ALTER TABLE "VerificationSubmission" ADD CONSTRAINT "VerificationSubmission_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "VerificationSubmission" ADD CONSTRAINT "VerificationSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL;

CREATE TABLE "VerificationDocument" ("id" TEXT PRIMARY KEY, "submissionId" TEXT NOT NULL, "kind" "DocumentKind" NOT NULL, "storageKey" TEXT NOT NULL, "originalName" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "VerificationSubmission"("id") ON DELETE CASCADE;

CREATE TABLE "AdminAuditLog" ("id" TEXT PRIMARY KEY, "actorId" TEXT NOT NULL, "targetId" TEXT, "action" TEXT NOT NULL, "reason" TEXT, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
CREATE INDEX "AdminAuditLog_targetId_idx" ON "AdminAuditLog"("targetId");
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT;
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE SET NULL;

CREATE TABLE "AccountDeletion" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "executeAfter" TIMESTAMP(3) NOT NULL, "completedAt" TIMESTAMP(3), "lastError" TEXT);
CREATE UNIQUE INDEX "AccountDeletion_userId_key" ON "AccountDeletion"("userId");
ALTER TABLE "AccountDeletion" ADD CONSTRAINT "AccountDeletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
