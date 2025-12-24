import { Platform, Linking } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';

// Keep native Google Sign-In as fallback option
let GoogleSignin: any;
let statusCodes: any;
let isInitialized = false;
let supabaseClient: SupabaseClient | null = null;

try {
  const googleSignInModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSignInModule.GoogleSignin;
  statusCodes = googleSignInModule.statusCodes;
} catch (error) {
  console.warn('⚠️ Google Sign-In native module not available. Using Supabase OAuth flow instead.');
  GoogleSignin = null;
  statusCodes = null;
}

// Complete the web browser authentication session
WebBrowser.maybeCompleteAuthSession();

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
 * Sign in with Google using Supabase OAuth (Web Browser flow)
 * This method uses Supabase's OAuth flow which opens a web browser
 * that handles phone verification and QR code scanning better than the native SDK
 * @returns Promise<string> - The Supabase access token
 */
export const signInWithGoogle = async (): Promise<string> => {
  try {
    console.log('🔐 Starting Google Sign-In with Supabase OAuth...');
    
    const supabase = getSupabaseClient();
    
    // Get the redirect URL - use a custom URL scheme for the app
    const redirectUrl = Platform.select({
      ios: `${Constants.expoConfig?.ios?.bundleIdentifier || 'com.minaezzat.onesteps'}://oauth/callback`,
      android: `${Constants.expoConfig?.android?.package || 'com.minaezzat.onesteps'}://oauth/callback`,
      default: 'exp://localhost:8081/--/oauth/callback',
    });

    console.log('📱 Using redirect URL:', redirectUrl);

    // Start the OAuth flow
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: false,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (oauthError) {
      console.error('❌ Supabase OAuth initiation error:', oauthError);
      throw new Error(oauthError.message || 'Failed to initiate Google Sign-In');
    }

    if (!data?.url) {
      throw new Error('No OAuth URL received from Supabase');
    }

    console.log('🌐 Opening OAuth URL in browser...');
    
    // Use WebBrowser.openAuthSessionAsync which handles redirects automatically
    // This works better than manually handling deep links
    // On iOS, it uses SFSafariViewController which can handle phone verification
    // On Android, it uses Chrome Custom Tabs
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUrl,
      {
        showInRecents: true, // Show in recent apps for easier switching
        preferEphemeralSession: false, // Keep session to handle phone verification
      }
    );
    
    console.log('📋 Browser result:', {
      type: result.type,
    });

    // Handle the result
    if (result.type === 'cancel') {
      throw new Error('Sign in was cancelled');
    }

    if (result.type === 'dismiss') {
      throw new Error('Sign in was dismissed');
    }

    if (result.type === 'locked') {
      throw new Error('Browser is locked. Please unlock your device and try again.');
    }

    // Extract the URL from the result (only available on success)
    if (result.type !== 'success') {
      throw new Error('OAuth flow did not complete successfully');
    }

    // Type guard: result.url is only available when type is 'success'
    const url = 'url' in result ? result.url : null;
    if (!url) {
      throw new Error('No URL returned from OAuth flow');
    }

    console.log('📋 OAuth redirect URL:', url);

    // Parse the URL to extract the code/token
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (urlError) {
      // If URL parsing fails, try to get session directly (Supabase might have handled it)
      console.log('⚠️ URL parsing failed, checking for existing session...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw new Error(sessionError.message || 'Failed to get session');
      }

      if (sessionData?.session?.access_token) {
        console.log('✅ Session found, returning access token');
        return sessionData.session.access_token;
      }

      throw new Error('Invalid OAuth redirect URL');
    }

    const code = parsedUrl.searchParams.get('code');
    const error = parsedUrl.searchParams.get('error');
    const errorDescription = parsedUrl.searchParams.get('error_description');
    const accessToken = parsedUrl.searchParams.get('access_token');
    const refreshToken = parsedUrl.searchParams.get('refresh_token');

    if (error) {
      console.error('❌ OAuth error:', error, errorDescription);
      throw new Error(errorDescription || error || 'OAuth authentication failed');
    }

    // Check if tokens are in the URL (fragment or query params)
    if (accessToken) {
      console.log('✅ Access token found in URL');
      // Set the session manually if we have tokens
      if (refreshToken) {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('❌ Session set error:', sessionError);
          throw new Error(sessionError.message || 'Failed to set session');
        }

        if (sessionData?.session?.access_token) {
          return sessionData.session.access_token;
        }
      }
      return accessToken;
    }

    // If we have a code, exchange it for a session
    if (code) {
      console.log('🔄 Exchanging authorization code for session...');
      const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('❌ Code exchange error:', exchangeError);
        throw new Error(exchangeError.message || 'Failed to exchange code for session');
      }

      if (!exchangeData?.session?.access_token) {
        throw new Error('No access token received after code exchange');
      }

      console.log('✅ Supabase OAuth successful, access token received');
      return exchangeData.session.access_token;
    }

    // If no code or token, check if Supabase automatically set the session
    console.log('⚠️ No code or token in URL, checking for existing session...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      throw new Error(sessionError.message || 'Failed to get session');
    }

    if (sessionData?.session?.access_token) {
      console.log('✅ Session found, returning access token');
      return sessionData.session.access_token;
    }

    throw new Error('No authorization code or access token received from OAuth flow');
  } catch (error: any) {
    console.error('❌ Google Sign-In error:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      platform: Platform.OS,
      stack: error?.stack,
    });

    // Check if user cancelled
    if (error?.message?.toLowerCase().includes('cancelled') || error?.message?.toLowerCase().includes('dismissed')) {
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

