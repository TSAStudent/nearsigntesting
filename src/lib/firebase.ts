'use client';

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

export const firebaseApp = isFirebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig as Record<string, string>)
  : null;

export const firestore = firebaseApp ? getFirestore(firebaseApp) : null;
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;

/**
 * Ensures Firestore requests have an auth context.
 * This avoids "missing or insufficient permissions" when rules require request.auth.
 */
export async function ensureFirebaseAnonymousAuth(): Promise<boolean> {
  if (!firebaseAuth) return false;
  if (firebaseAuth.currentUser) return true;
  try {
    await signInAnonymously(firebaseAuth);
    return true;
  } catch (error) {
    console.error('Failed to initialize Firebase anonymous auth:', error);
    return false;
  }
}
