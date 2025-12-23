import { Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Dynamically import GoogleSignin to handle cases where native module isn't available
let GoogleSignin: any;
let statusCodes: any;
let isInitialized = false;
let supabaseClient: SupabaseClient | null = null;

try {
  const googleSignInModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSignInModule.GoogleSignin;
  statusCodes = googleSignInModule.statusCodes;
} catch (error) {
  console.warn('⚠️ Google Sign-In native module not available. Rebuild the app after installing the package.');
  GoogleSignin = null;
  statusCodes = null;
}

// Web Client ID (for backend verification)
// This is the one provided by the backend team
const WEB_CLIENT_ID = '309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj.apps.googleusercontent.com';

// iOS Client ID - needs to be created in Google Cloud Console
// TODO: Replace with actual iOS Client ID once created in Google Cloud Console
// Format: XXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com
const IOS_CLIENT_ID = '309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj.apps.googleusercontent.com';

// Android Client ID - needs to be created in Google Cloud Console
// TODO: Replace with actual Android Client ID once created in Google Cloud Console
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

    GoogleSignin.configure(config);
    isInitialized = true;

    console.log('✅ Google Sign-In initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Google Sign-In:', error);
    isInitialized = false;
    // Don't throw - allow app to continue without Google Sign-In
    console.warn('⚠️ App will continue without Google Sign-In. Rebuild the app to enable it.');
  }
};

/**
 * Initialize Supabase client for OAuth
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
 * Sign in with Google using Supabase OAuth
 * @returns Promise<string> - The Supabase access token
 */
export const signInWithGoogle = async (): Promise<string> => {
  try {
    // Check if native module is available
    if (!GoogleSignin) {
      const errorMsg = 'Google Sign-In native module not available. Please rebuild the app: npx expo run:ios or npx expo run:android';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    // Ensure Google Sign-In is initialized
    if (!isInitialized) {
      console.warn('⚠️ Google Sign-In not initialized yet. Initializing now...');
      await initializeGoogleSignIn();
      if (!isInitialized) {
        throw new Error('Failed to initialize Google Sign-In. Please try again.');
      }
    }

    // Ensure Google Sign-In is configured before attempting sign-in
    // This is especially important on iOS where configuration might not persist
    try {
      // Re-configure to ensure it's set up correctly
      const config: any = {
        webClientId: WEB_CLIENT_ID,
        offlineAccess: true,
        forceCodeForRefreshToken: true,
        scopes: ['email', 'profile'],
      };

      if (Platform.OS === 'ios') {
        const iosClientIdToUse = IOS_CLIENT_ID.includes('YOUR_IOS_CLIENT_ID_HERE') 
          ? WEB_CLIENT_ID 
          : IOS_CLIENT_ID;
        if (iosClientIdToUse) {
          config.iosClientId = iosClientIdToUse;
        }
      }

      GoogleSignin.configure(config);
      console.log('✅ Google Sign-In re-configured before sign-in');
    } catch (configError: any) {
      console.warn('⚠️ Failed to re-configure Google Sign-In:', configError);
      // Continue anyway - it might already be configured
    }

    // Check if Google Play Services are available (Android only)
    if (Platform.OS === 'android') {
      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      } catch (playServicesError: any) {
        console.warn('Google Play Services check failed:', playServicesError);
        // Continue anyway - the sign-in will fail with a clearer error if needed
      }
    }

    // Sign in - wrap in try-catch to handle native crashes gracefully
    let userInfo;
    try {
      // Use a timeout to prevent hanging on iOS
      // Increased to 60 seconds to give users more time to complete the sign-in flow
      const SIGN_IN_TIMEOUT_MS = 100000; // 100 seconds
      const signInPromise = GoogleSignin.signIn();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Google Sign-In timed out after ${SIGN_IN_TIMEOUT_MS / 1000} seconds`)), SIGN_IN_TIMEOUT_MS);
      });
      
      userInfo = await Promise.race([signInPromise, timeoutPromise]) as any;
    } catch (signInError: any) {
      console.error('❌ GoogleSignin.signIn() threw error:', signInError);
      
      // Handle specific error codes
      if (statusCodes) {
        if (signInError?.code === statusCodes.SIGN_IN_CANCELLED) {
          throw new Error('Sign in was cancelled');
        } else if (signInError?.code === statusCodes.IN_PROGRESS) {
          throw new Error('Sign in is already in progress');
        } else if (signInError?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          throw new Error('Google Play Services not available or outdated');
        }
      }
      
      // Re-throw with more context
      const errorMessage = signInError?.message || signInError?.toString() || 'Google Sign-In failed';
      throw new Error(errorMessage);
    }
    
    // Log userInfo for debugging
    console.log('📋 Google Sign-In userInfo received:', {
      hasUserInfo: !!userInfo,
      hasIdToken: !!userInfo?.idToken || !!userInfo?.data?.idToken,
      hasServerAuthCode: !!userInfo?.serverAuthCode || !!userInfo?.data?.serverAuthCode,
      userInfoKeys: userInfo ? Object.keys(userInfo) : [],
      userInfo: userInfo ? JSON.stringify(userInfo, null, 2) : 'null',
    });
    
    // Handle different response structures
    // Some versions return { idToken, ... } directly, others return { type: "success", data: { idToken, ... } }
    const idToken = userInfo?.idToken || userInfo?.data?.idToken;
    const serverAuthCode = userInfo?.serverAuthCode || userInfo?.data?.serverAuthCode;
    
    if (!userInfo || !idToken) {
      // Check if user cancelled (userInfo might be null but no error thrown)
      if (statusCodes && userInfo?.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Sign in was cancelled');
      }
      
      // Provide more helpful error message
      const errorDetails = userInfo 
        ? `UserInfo received but missing idToken. Available keys: ${Object.keys(userInfo).join(', ')}`
        : 'No userInfo received from Google Sign-In';
      console.error('❌', errorDetails);
      throw new Error('No ID token received from Google Sign-In. Please try again or check your Google account permissions.');
    }

    console.log('✅ Google ID token received, exchanging with Supabase...');
    
    // Step 2: Exchange Google ID token for Supabase session
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      console.error('❌ Supabase OAuth error:', error);
      throw new Error(error.message || 'Failed to authenticate with Supabase');
    }

    if (!data.session || !data.session.access_token) {
      throw new Error('No access token received from Supabase');
    }

    console.log('✅ Supabase OAuth successful, access token received');
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

    // Don't throw if user cancelled - this is expected behavior
    if (statusCodes && error?.code === statusCodes.SIGN_IN_CANCELLED) {
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
    return await GoogleSignin.isSignedIn();
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

