import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, DecodedIdToken, getAuth } from 'firebase-admin/auth';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app!: App;
  auth!: Auth;

  onModuleInit() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are required');
    }
    this.app = getApps()[0] ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    this.auth = getAuth(this.app);
    this.logger.log(`Firebase Admin initialized for ${projectId}`);
  }

  verify(token: string, checkRevoked = true): Promise<DecodedIdToken> {
    return this.auth.verifyIdToken(token, checkRevoked);
  }
}
