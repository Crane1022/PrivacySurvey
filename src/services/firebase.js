// Loaded only in live mode (dynamic import). Single, guarded initialisation.
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const env = import.meta.env
const cfg = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

export const firebaseConfigured = Boolean(cfg.apiKey && cfg.projectId && cfg.appId)
const app = firebaseConfigured ? (getApps().length ? getApp() : initializeApp(cfg)) : null

export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null

export function requireFirebase() {
  if (!firebaseConfigured) {
    throw new Error('Firebase is not configured. Add the VITE_FIREBASE_* values to your .env file.')
  }
}
