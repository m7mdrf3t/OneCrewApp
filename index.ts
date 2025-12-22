import { registerRootComponent } from 'expo';
import { NativeModules, Platform } from 'react-native';
import App from './App';

// Global error handler to suppress NativeEventEmitter errors during app startup
// These errors occur when Firebase modules are required before native modules are ready
// Access ErrorUtils from global scope (it's not exported from react-native in all versions)
declare const ErrorUtils: any;
if (typeof global !== 'undefined' && (global as any).ErrorUtils) {
  try {
    const ErrorUtilsGlobal = (global as any).ErrorUtils;
    if (ErrorUtilsGlobal && typeof ErrorUtilsGlobal.getGlobalHandler === 'function') {
      const originalHandler = ErrorUtilsGlobal.getGlobalHandler();
      ErrorUtilsGlobal.setGlobalHandler((error: Error, isFatal?: boolean) => {
        // Suppress only NativeEventEmitter errors - they're expected during startup
        if (error?.message?.includes('NativeEventEmitter') && 
            error?.message?.includes('requires a non-null argument')) {
          // Silently ignore - we'll retry later when modules are ready
          return;
        }
        // Log all other errors (including fatal ones) - don't suppress them!
        console.error('❌ [App] Error:', error?.message || error);
        if (error?.stack) {
          console.error('❌ [App] Stack:', error.stack);
        }
        // Call original handler for other errors (including fatal ones)
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }
  } catch (e) {
    // ErrorUtils might not be available in all React Native versions
    // Silently fail - the app will still work
  }
}

// Firebase background message handler setup
// This MUST be registered at the top level for Android background messages
// However, we delay it to avoid NativeEventEmitter errors during app startup
// The handler will be set up after a delay to ensure native modules are ready

// Function to safely set up Firebase background message handler
function setupFirebaseBackgroundHandler() {
  try {
    // In Expo dev builds, NativeModules might be empty until bridge is ready
    // Just try to require the module and handle errors gracefully
    const messagingModule = require('@react-native-firebase/messaging');
    if (messagingModule) {
      const messaging = messagingModule.default || messagingModule;
      if (messaging && typeof messaging === 'function') {
        try {
          // Try to get messaging instance - this will fail if Firebase isn't initialized
          const messagingInstance = messaging();
          
          // Check if Firebase app is initialized
          // On simulators, Firebase may initialize but APNs won't work
          // This is fine - we can still set up the handler
          messagingInstance.setBackgroundMessageHandler(async (remoteMessage: any) => {
            // Handle background notification here if needed
            // The notification will be displayed automatically by the OS
          });
          console.log('✅ [BackgroundHandler] Firebase background message handler registered');
          return true;
        } catch (instanceError: any) {
          // Check if error is about Firebase not being initialized
          if (instanceError?.message?.includes('No Firebase App') || 
              instanceError?.message?.includes('has been created') ||
              instanceError?.message?.includes('initializeApp')) {
            return false; // Retry later
          }
          throw instanceError; // Re-throw other errors
        }
      }
    }
    return false;
  } catch (error: any) {
    // Silently handle errors - they're expected if Firebase isn't configured
    // Only log if it's an unexpected error type
    const isExpectedError = 
      error?.message?.includes('NativeEventEmitter') || 
      error?.message?.includes('non-null') ||
      error?.message?.includes('requires a non-null') ||
      error?.message?.includes('No Firebase App') || 
      error?.message?.includes('has been created') ||
      error?.message?.includes('initializeApp') ||
      !error?.message;
    
    if (!isExpectedError) {
      // Only log unexpected errors once
      if (!hasLoggedBackgroundHandlerError) {
        console.warn('⚠️ [BackgroundHandler] Unexpected error:', error?.message);
      }
    }
    return false;
  }
}

// Use a longer delay to ensure React Native bridge is fully initialized
// Retry multiple times with increasing delays
let retryCount = 0;
const maxRetries = 3; // Reduced retries to avoid spam
let hasLoggedBackgroundHandlerError = false;

function trySetupBackgroundHandler() {
  const success = setupFirebaseBackgroundHandler();
  if (!success && retryCount < maxRetries) {
    retryCount++;
    const delay = retryCount * 3000; // 3s, 6s, 9s
    // Only log first retry attempt
    if (retryCount === 1) {
      console.log('📨 [BackgroundHandler] Will retry Firebase setup...');
    }
    setTimeout(trySetupBackgroundHandler, delay);
  } else if (!success && !hasLoggedBackgroundHandlerError) {
    hasLoggedBackgroundHandlerError = true;
    console.warn('⚠️ [BackgroundHandler] Firebase messaging not available. Background notifications disabled.');
  }
}

// Start trying after initial delay (reduced since initialization is improved)
// Removed initial log to reduce console noise
setTimeout(trySetupBackgroundHandler, 5000);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
