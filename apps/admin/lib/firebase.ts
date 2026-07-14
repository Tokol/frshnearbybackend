import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const app = getApps()[0] ?? initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSy000000000000000000000000000000000',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'localhost',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'build-placeholder',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1:000000000000:web:0000000000000000000000',
});
export const auth = getAuth(app);
