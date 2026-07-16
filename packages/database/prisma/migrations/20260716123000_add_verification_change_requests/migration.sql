ALTER TABLE "VerificationSubmission"
ADD COLUMN "userResponse" TEXT,
ADD COLUMN "requestedDocumentKinds" "DocumentKind"[] NOT NULL DEFAULT ARRAY[]::"DocumentKind"[],
ADD COLUMN "requiresTextResponse" BOOLEAN NOT NULL DEFAULT false;
