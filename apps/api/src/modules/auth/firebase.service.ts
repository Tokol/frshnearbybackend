import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { Auth, DecodedIdToken, getAuth } from "firebase-admin/auth";
import { getMessaging, Messaging } from "firebase-admin/messaging";

function renderValue(name: string): string | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines[0] === name ? lines.slice(1).join("\n") : raw;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app!: App;
  auth!: Auth;
  messaging!: Messaging;

  onModuleInit() {
    const projectId = renderValue("FIREBASE_PROJECT_ID");
    const clientEmail = renderValue("FIREBASE_CLIENT_EMAIL");
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are required",
      );
    }
    if (!/^[a-z0-9][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)) {
      throw new Error(
        "FIREBASE_PROJECT_ID is malformed; enter only the Firebase project ID",
      );
    }
    if (!clientEmail.endsWith(".iam.gserviceaccount.com")) {
      throw new Error(
        "FIREBASE_CLIENT_EMAIL must be a Firebase service-account email",
      );
    }
    if (
      !privateKey.includes("-----BEGIN PRIVATE KEY-----") ||
      !privateKey.includes("-----END PRIVATE KEY-----")
    ) {
      throw new Error(
        "FIREBASE_PRIVATE_KEY must contain the complete service-account private key",
      );
    }
    this.app =
      getApps()[0] ??
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    this.auth = getAuth(this.app);
    this.messaging = getMessaging(this.app);
    this.logger.log(`Firebase Admin initialized for ${projectId}`);
  }

  verify(token: string, checkRevoked = true): Promise<DecodedIdToken> {
    return this.auth.verifyIdToken(token, checkRevoked);
  }
}
