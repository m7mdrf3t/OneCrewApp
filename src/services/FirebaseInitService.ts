/**
 * Firebase Initialization Service
 * Ensures Firebase is initialized before any Firebase modules (e.g. messaging) are used.
 * Handles the "No Firebase App '[DEFAULT]' has been created" error by explicitly
 * initializing Firebase when native auto-initialization hasn't run.
 *
 * Config priority:
 * 1. Native SDK reads GoogleService-Info.plist (iOS) / google-services.json (Android) — preferred.
 * 2. EXPO_PUBLIC_FIREBASE_* environment variables (set in .env or eas.json per build profile).
 */

const getFirebaseConfig = (): Record<string, string> | null => {
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '';
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '';
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '';

  if (!apiKey || !projectId || !appId) {
    return null;
  }

  return {
    apiKey,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId,
    databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || `https://${projectId}-default-rtdb.firebaseio.com`,
  };
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
