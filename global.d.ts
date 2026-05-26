/**
 * React Native / Metro globals.
 * @see https://reactnative.dev/docs/javascript-environment
 */
declare const __DEV__: boolean;

declare namespace NodeJS {
  interface ProcessEnv {
    /** API base URL — set in .env (local) or eas.json env per build profile. */
    EXPO_PUBLIC_API_URL?: string;
    /** Supabase project URL. */
    EXPO_PUBLIC_SUPABASE_URL?: string;
    /** Supabase anonymous key. */
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    /** Firebase JS SDK config — fallback when native config files are absent. */
    EXPO_PUBLIC_FIREBASE_API_KEY?: string;
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
    EXPO_PUBLIC_FIREBASE_PROJECT_ID?: string;
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?: string;
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?: string;
    EXPO_PUBLIC_FIREBASE_APP_ID?: string;
    EXPO_PUBLIC_FIREBASE_DATABASE_URL?: string;
  }
}
