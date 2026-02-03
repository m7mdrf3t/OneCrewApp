/**
 * Firebase Initialization Service
 * Ensures Firebase is initialized before any Firebase modules (e.g. messaging) are used.
 * Handles the "No Firebase App '[DEFAULT]' has been created" error by explicitly
 * initializing Firebase when native auto-initialization hasn't run.
 *
 * Which config is used:
 * - iOS: Native SDK reads ios/Steps/GoogleService-Info.plist (from app bundle). If present,
 *   you'll see "Already initialized (native config)" and "Active project: <id>" in console.
 * - Fallback: app.json → extra.firebaseConfig. To verify at runtime, check for "Active project: steps-cfc27".
 */

import { Platform } from 'react-native';

// Firebase config - get these from Firebase Console → Project Settings → Your apps
// Add to app.json extra.firebaseConfig or set as environment variables
const getFirebaseConfig = (): Record<string, string> | null => {
  try {
    // Try app.json extra first (set by user)
    const expoConfig = require('../../app.json');
    const firebaseConfig = expoConfig?.expo?.extra?.firebaseConfig;
    if (firebaseConfig && typeof firebaseConfig === 'object') {
      return firebaseConfig as Record<string, string>;
    }

    // Fallback to environment variables (for EAS Build)
    const config: Record<string, string> = {};
    const envVars = [
      'EXPO_PUBLIC_FIREBASE_API_KEY',
      'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
      'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'EXPO_PUBLIC_FIREBASE_APP_ID',
      'EXPO_PUBLIC_FIREBASE_DATABASE_URL',
    ];
    let hasAny = false;
    for (const key of envVars) {
      const value = (process.env as any)[key];
      if (value) {
        config[key.replace('EXPO_PUBLIC_FIREBASE_', '').toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value;
        hasAny = true;
      }
    }
    if (hasAny) {
      const projectId = (process.env as any).EXPO_PUBLIC_FIREBASE_PROJECT_ID || '';
      return {
        apiKey: (process.env as any).EXPO_PUBLIC_FIREBASE_API_KEY || '',
        authDomain: (process.env as any).EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
        projectId,
        storageBucket: (process.env as any).EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: (process.env as any).EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: (process.env as any).EXPO_PUBLIC_FIREBASE_APP_ID || '',
        databaseURL: (process.env as any).EXPO_PUBLIC_FIREBASE_DATABASE_URL || `https://${projectId}-default-rtdb.firebaseio.com`,
      };
    }

    return null;
  } catch {
    return null;
  }
};

let isInitialized = false;
let initPromise: Promise<boolean> | null = null;

/**
 * Initialize Firebase if not already initialized.
 * Call this before using any Firebase module (messaging, etc.)
 */
export async function ensureFirebaseInitialized(): Promise<boolean> {
  if (isInitialized) {
    return true;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const firebase = require('@react-native-firebase/app').default;

      // Check if Firebase is already initialized (via native config files)
      // iOS: GoogleService-Info.plist in app bundle; Android: google-services.json
      try {
        const app = firebase.app();
        if (app && app.name === '[DEFAULT]') {
          isInitialized = true;
          const projectId = (app as any).options?.projectId ?? 'unknown';
          if (__DEV__) {
            console.log('✅ [Firebase] Already initialized (native config)');
            console.log('✅ [Firebase] Active project:', projectId);
          }
          return true;
        }
      } catch {
        // Not initialized - will try explicit init below
      }

      // Try explicit initialization with config from app.json or env
      const config = getFirebaseConfig();
      if (config) {
        const projectId = config.projectId || '';
        const credentials = {
          apiKey: config.apiKey || '',
          authDomain: config.authDomain || '',
          projectId,
          storageBucket: config.storageBucket || '',
          messagingSenderId: config.messagingSenderId || config.senderId || '',
          appId: config.appId || '',
          // Required by React Native Firebase SDK even when not using Realtime Database
          databaseURL: config.databaseURL || `https://${projectId}-default-rtdb.firebaseio.com`,
        };

        // All three are required for Firebase init
        if (credentials.apiKey?.trim() && credentials.projectId?.trim() && credentials.appId?.trim()) {
          await firebase.initializeApp(credentials as any);
          isInitialized = true;
          if (__DEV__) {
            console.log('✅ [Firebase] Initialized from app config');
            console.log('✅ [Firebase] Active project:', credentials.projectId);
          }
          return true;
        }
      }

      if (__DEV__) {
        console.warn(
          '⚠️ [Firebase] Not initialized. Add GoogleService-Info.plist (iOS) and google-services.json (Android), ' +
          'or add firebaseConfig to app.json extra. See FIREBASE_SETUP_INSTRUCTIONS.md'
        );
      }
      return false;
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (__DEV__) {
        console.warn('⚠️ [Firebase] Init failed:', msg);
      }
      return false;
    }
  })();

  return initPromise;
}

/**
 * Check if Firebase is ready to use (sync check)
 */
export function isFirebaseReady(): boolean {
  return isInitialized;
}
