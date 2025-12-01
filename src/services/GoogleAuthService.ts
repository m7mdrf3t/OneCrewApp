import { Platform } from 'react-native';

// Dynamically import GoogleSignin to handle cases where native module isn't available
let GoogleSignin: any;
let statusCodes: any;

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

    console.log('✅ Google Sign-In initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Google Sign-In:', error);
    // Don't throw - allow app to continue without Google Sign-In
    console.warn('⚠️ App will continue without Google Sign-In. Rebuild the app to enable it.');
  }
};

/**
 * Sign in with Google and return the ID token
 * @returns Promise<string> - The Google ID token
 */
export const signInWithGoogle = async (): Promise<string> => {
  try {
    if (!GoogleSignin) {
      throw new Error('Google Sign-In native module not available. Please rebuild the app: npx expo run:ios or npx expo run:android');
    }

    // Check if Google Play Services are available (Android only)
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    // Sign in
    const userInfo = await GoogleSignin.signIn();
    
    if (!userInfo.idToken) {
      throw new Error('No ID token received from Google Sign-In');
    }

    console.log('✅ Google Sign-In successful');
    return userInfo.idToken;
  } catch (error: any) {
    console.error('❌ Google Sign-In error:', error);

    if (!GoogleSignin) {
      throw new Error('Google Sign-In native module not available. Please rebuild the app.');
    }

    if (statusCodes && error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error('Sign in was cancelled');
    } else if (statusCodes && error.code === statusCodes.IN_PROGRESS) {
      throw new Error('Sign in is already in progress');
    } else if (statusCodes && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Services not available or outdated');
    } else {
      throw new Error(error.message || 'Google Sign-In failed');
    }
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

