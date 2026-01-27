import { Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Native Google Sign-In SDK
let GoogleSignin: any;
let statusCodes: any;
let isInitialized = false;
let supabaseClient: SupabaseClient | null = null;

try {
  const googleSignInModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSignInModule.GoogleSignin;
  statusCodes = googleSignInModule.statusCodes;
} catch (error) {
  console.warn('⚠️ Google Sign-In native module not available.');
  GoogleSignin = null;
  statusCodes = null;
}

// NOTE: These Client IDs are used for the native Google Sign-In SDK

// Web Client ID (required for backend verification and Android)
// This should match the Web Client ID configured in your backend
const WEB_CLIENT_ID = '309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj.apps.googleusercontent.com';

// iOS Client ID - for native SDK on iOS
// Format: XXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com
const IOS_CLIENT_ID = '309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj.apps.googleusercontent.com';

// Android Client ID - for native SDK on Android
// Format: XXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com
const ANDROID_CLIENT_ID = 'YOUR_ANDROID_CLIENT_ID_HERE.apps.googleusercontent.com';

/**
 * Initialize Google Sign-In service
 * This should be called once when the app starts
 */
export const initializeGoogleSignIn = async () => {
  try {
    // Check if native module is available
    if (!GoogleSignin) {
      console.warn('⚠️ Google Sign-In native module not available.');
      console.warn('⚠️ Please rebuild the app:');
      console.warn('   iOS: npx expo run:ios');
      console.warn('   Android: npx expo run:android');
      return; // Don't throw, just return gracefully
    }

    // Determine iOS Client ID - use Web Client ID as fallback if iOS Client ID not configured
    let iosClientIdToUse: string | undefined;
    if (Platform.OS === 'ios') {
        if (IOS_CLIENT_ID.includes('YOUR_IOS_CLIENT_ID_HERE')) {
            console.warn('⚠️ iOS Client ID not configured. Using Web Client ID as fallback.');
        console.warn('⚠️ This may work for testing, but you should create an iOS OAuth Client ID in Google Cloud Console.');
        console.warn('⚠️ See GOOGLE_SIGNIN_SETUP.md for instructions.');
        // Use Web Client ID as fallback for iOS (not ideal, but will work for testing)
        iosClientIdToUse = WEB_CLIENT_ID;
      } else {
        iosClientIdToUse = IOS_CLIENT_ID;
      }
    }

    // Warn if Android Client ID is still placeholder
    if (Platform.OS === 'android' && ANDROID_CLIENT_ID.includes('YOUR_ANDROID_CLIENT_ID_HERE')) {
      console.warn('⚠️ Android Client ID not configured. Please update ANDROID_CLIENT_ID in GoogleAuthService.ts');
      console.warn('⚠️ See GOOGLE_SIGNIN_SETUP.md for instructions');
    }

    // Validate that GoogleSignin has the configure method
    if (typeof GoogleSignin.configure !== 'function') {
      throw new Error('Google Sign-In native module is not properly loaded. The configure method is not available.');
    }

    // Configure Google Sign-In
    const config: any = {
      webClientId: WEB_CLIENT_ID, // Required for backend verification
      offlineAccess: true, // If you want to access Google API on behalf of the user FROM YOUR SERVER
      forceCodeForRefreshToken: true, // [Android] related to `serverAuthCode`, read the docs link below *.
      scopes: ['email', 'profile'], // What API you want to access on behalf of the user, default is email and profile
    };

    // Add iOS Client ID if on iOS
    if (Platform.OS === 'ios' && iosClientIdToUse) {
      config.iosClientId = iosClientIdToUse;
    }

    try {
      GoogleSignin.configure(config);
      isInitialized = true;
    } catch (configError: any) {
      console.error('❌ Failed to configure Google Sign-In:', configError);
      isInitialized = false;
      throw new Error(`Failed to configure Google Sign-In: ${configError?.message || 'Configuration error'}`);
    }

    console.log('✅ Google Sign-In initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Google Sign-In:', error);
    isInitialized = false;
    // Don't throw - allow app to continue without Google Sign-In
    console.warn('⚠️ App will continue without Google Sign-In. Rebuild the app to enable it.');
  }
};

/**
 * Initialize Supabase client for token exchange
 */
const getSupabaseClient = (): SupabaseClient => {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = 
    Constants.expoConfig?.extra?.supabaseUrl || 
    process.env.SUPABASE_URL || 
    '';
  const supabaseAnonKey = 
    Constants.expoConfig?.extra?.supabaseAnonKey || 
    process.env.SUPABASE_ANON_KEY || 
    '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or Anon Key not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in app.json or environment variables.');
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
};

/**
 * Sign in with Google using native SDK (in-app authentication)
 * This method uses the native Google Sign-In SDK which provides in-app authentication,
 * then exchanges the Google ID token with Supabase to get a Supabase access token
 * @returns Promise<string> - The Supabase access token
 */
export const signInWithGoogle = async (): Promise<string> => {
  try {
    console.log('🔐 Starting Google Sign-In with native SDK...');
    
    // Check if native module is available
    if (!GoogleSignin) {
      throw new Error('Google Sign-In native module not available. Please rebuild the app using "npx expo run:ios" or "npx expo run:android".');
    }

    // Check if initialized
    if (!isInitialized) {
      console.warn('⚠️ Google Sign-In not initialized, initializing now...');
      await initializeGoogleSignIn();
      if (!isInitialized) {
        throw new Error('Failed to initialize Google Sign-In. Please check your configuration.');
      }
    }

    // Validate that GoogleSignin has the required methods
    if (typeof GoogleSignin.signIn !== 'function') {
      throw new Error('Google Sign-In native module is not properly initialized. The signIn method is not available.');
    }

    // Check if user is already signed in (using getCurrentUser instead of isSignedIn)
    try {
      if (typeof GoogleSignin.getCurrentUser === 'function') {
        const currentUser = await GoogleSignin.getCurrentUser();
        if (currentUser) {
          console.log('📋 User already signed in, signing out first...');
          try {
            if (typeof GoogleSignin.signOut === 'function') {
              await GoogleSignin.signOut(); // Sign out first to ensure fresh sign-in
            }
          } catch (signOutError) {
            console.warn('⚠️ Error signing out previous session:', signOutError);
            // Continue even if sign out fails
          }
        }
      }
    } catch (checkError) {
      // If getCurrentUser fails, it means no user is signed in - that's fine, continue
      console.log('📋 No existing Google session found, proceeding with sign-in...');
    }

    // Step 1: Sign in with Google using native SDK (in-app)
    console.log('🔄 Requesting Google Sign-In via native SDK...');
    
    // Additional safety check before calling native method
    if (!GoogleSignin || typeof GoogleSignin.signIn !== 'function') {
      throw new Error('Google Sign-In native module is not available or not properly initialized. Please rebuild the app.');
    }
    
    let userInfo;
    try {
      userInfo = await GoogleSignin.signIn();
    } catch (nativeError: any) {
      // Catch native errors that might not be properly handled
      console.error('❌ Native Google Sign-In error:', nativeError);
      
      // Re-throw with more context
      if (nativeError?.message) {
        throw nativeError;
      }
      
      // If error doesn't have a message, create a user-friendly one
      throw new Error(`Google Sign-In failed: ${nativeError?.toString() || 'Unknown error occurred'}`);
    }

    if (!userInfo) {
      throw new Error('No user info returned from Google Sign-In');
    }

    console.log('✅ Google Sign-In successful');
    console.log('📋 User info:', {
      id: userInfo.data?.user?.id,
      email: userInfo.data?.user?.email,
      name: userInfo.data?.user?.name,
      hasIdToken: !!userInfo.data?.idToken,
    });

    // Get the ID token
    const idToken = userInfo.data?.idToken;
    if (!idToken) {
      throw new Error('No ID token received from Google Sign-In. Please ensure the Google Sign-In SDK is properly configured.');
    }

    console.log('✅ Google ID token received, exchanging with Supabase...');
    
    // Step 2: Exchange Google ID token for Supabase access token
    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (supabaseError: any) {
      console.error('❌ Failed to initialize Supabase client:', supabaseError);
      throw new Error(`Failed to initialize authentication service: ${supabaseError?.message || 'Supabase configuration error'}`);
    }
    
    if (!supabase || !supabase.auth) {
      throw new Error('Supabase client is not properly initialized');
    }
    
    let data, error;
    try {
      const result = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      data = result.data;
      error = result.error;
    } catch (supabaseCallError: any) {
      console.error('❌ Supabase signInWithIdToken error:', supabaseCallError);
      throw new Error(`Failed to exchange Google token with authentication service: ${supabaseCallError?.message || 'Token exchange failed'}`);
    }

    if (error) {
      console.error('❌ Supabase token exchange error:', error);
      throw new Error(error.message || 'Failed to authenticate with Supabase');
    }

    if (!data.session || !data.session.access_token) {
      throw new Error('No access token received from Supabase');
    }

    console.log('✅ Supabase authentication successful, access token received');
    return data.session.access_token;
  } catch (error: any) {
    console.error('❌ Google Sign-In error:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      platform: Platform.OS,
      stack: error?.stack,
    });

    // Handle specific error codes
    if (statusCodes) {
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Sign in was cancelled');
      }
      if (error?.code === statusCodes.IN_PROGRESS) {
        throw new Error('Sign in is already in progress');
      }
      if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services is not available. Please install Google Play Services on your device.');
      }
    }

    // Check if user cancelled
    if (error?.message?.toLowerCase().includes('cancelled') || 
        error?.message?.toLowerCase().includes('canceled') ||
        error?.code === 'SIGN_IN_CANCELLED') {
      throw new Error('Sign in was cancelled');
    }
    
    // Return a user-friendly error message
    const errorMessage = error?.message || error?.toString() || 'Google Sign-In failed. Please try again.';
    throw new Error(errorMessage);
  }
};

/**
 * Sign out from Google
 */
export const signOutFromGoogle = async (): Promise<void> => {
  try {
    if (!GoogleSignin) {
      console.warn('⚠️ Google Sign-In native module not available');
      return;
    }
    await GoogleSignin.signOut();
    console.log('✅ Google Sign-Out successful');
  } catch (error) {
    console.error('❌ Google Sign-Out error:', error);
    throw error;
  }
};

/**
 * Check if user is currently signed in to Google
 */
export const isSignedIn = async (): Promise<boolean> => {
  try {
    if (!GoogleSignin) {
      return false;
    }
    // Use getCurrentUser to check if signed in (more reliable than isSignedIn method)
    const currentUser = await GoogleSignin.getCurrentUser();
    return currentUser !== null;
  } catch (error) {
    console.error('❌ Error checking Google Sign-In status:', error);
    return false;
  }
};

/**
 * Get current Google user info (if signed in)
 */
export const getCurrentUser = async () => {
  try {
    if (!GoogleSignin) {
      return null;
    }
    return await GoogleSignin.getCurrentUser();
  } catch (error) {
    console.error('❌ Error getting current Google user:', error);
    return null;
  }
};

