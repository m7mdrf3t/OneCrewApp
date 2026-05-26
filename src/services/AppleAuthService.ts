import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let isAvailable = false;
let supabaseClient: SupabaseClient | null = null;

/**
 * Check if Apple Authentication is available
 * Apple Sign In is only available on iOS 13+
 */
export const isAppleAuthenticationAvailable = (): boolean => {
  if (Platform.OS !== 'ios') {
    return false;
  }
  return isAvailable;
};

/**
 * Initialize Apple Authentication
 * This should be called once when the app starts
 */
export const initializeAppleAuthentication = async (): Promise<void> => {
  try {
    if (Platform.OS !== 'ios') {
      console.log('ℹ️ Apple Authentication is only available on iOS');
      isAvailable = false;
      return;
    }

    const available = await AppleAuthentication.isAvailableAsync();
    isAvailable = available;
    
    if (available) {
      console.log('✅ Apple Authentication is available');
    } else {
      console.log('⚠️ Apple Authentication is not available on this device (requires iOS 13+)');
    }
  } catch (error) {
    console.error('❌ Failed to check Apple Authentication availability:', error);
    isAvailable = false;
  }
};

/**
 * Initialize Supabase client for OAuth
 */
const getSupabaseClient = (): SupabaseClient => {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or Anon Key not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env or eas.json.');
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
};

/**
 * Sign in with Apple using Supabase OAuth
 * @returns Promise<string> - The Supabase access token
 */
export const signInWithApple = async (): Promise<string> => {
  try {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign In is only available on iOS');
    }

    // Check if Apple Authentication is available
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) {
      throw new Error('Apple Sign In is not available on this device. Please update to iOS 13 or later.');
    }

    console.log('🍎 Requesting Apple Sign-In...');
    
    // Request credential
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Apple Sign In failed: No identity token received');
    }

    console.log('✅ Apple identity token received, exchanging with Supabase...');
    
    // Step 2: Exchange Apple identity token for Supabase session
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
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
    // Check if user cancelled
    if (error.code === 'ERR_REQUEST_CANCELED' || error.message?.toLowerCase().includes('cancel')) {
      const cancelError = new Error('User cancelled Apple Sign In');
      (cancelError as any).code = 'CANCELLED';
      throw cancelError;
    }
    
    console.error('❌ Apple Sign-In error:', error);
    throw error;
  }
};

/**
 * Sign out from Apple (if needed)
 * Note: Apple doesn't provide a sign out method, but we can clear local state
 */
export const signOutFromApple = async (): Promise<void> => {
  // Apple doesn't provide a sign out method
  // The credential is only valid for the current session
  console.log('ℹ️ Apple Sign Out: Clearing local state (Apple doesn\'t provide sign out API)');
};

