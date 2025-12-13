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
        // Suppress NativeEventEmitter errors - they're expected during startup
        if (error?.message?.includes('NativeEventEmitter') && 
            error?.message?.includes('requires a non-null argument')) {
          // Silently ignore - we'll retry later when modules are ready
          return;
        }
        // Call original handler for other errors
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
  console.log('📨 [BackgroundHandler] Attempting to set up Firebase background message handler...');
  try {
    // In Expo dev builds, NativeModules might be empty until bridge is ready
    // Just try to require the module and handle errors gracefully
    console.log('📨 [BackgroundHandler] Requiring @react-native-firebase/messaging...');
    const messagingModule = require('@react-native-firebase/messaging');
    if (messagingModule) {
      console.log('✅ [BackgroundHandler] Messaging module loaded');
      const messaging = messagingModule.default || messagingModule;
      if (messaging && typeof messaging === 'function') {
        console.log('📨 [BackgroundHandler] Setting up background message handler...');
        messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
          console.log('📨 [BackgroundHandler] Message handled in background:', remoteMessage);
          console.log('📨 [BackgroundHandler] Title:', remoteMessage.notification?.title);
          console.log('📨 [BackgroundHandler] Body:', remoteMessage.notification?.body);
          console.log('📨 [BackgroundHandler] Data:', remoteMessage.data);
          // Handle background notification here if needed
          // The notification will be displayed automatically by the OS
        });
        console.log('✅ [BackgroundHandler] Firebase background message handler registered successfully');
        return true;
      } else {
        console.error('❌ [BackgroundHandler] Messaging is not a function. Type:', typeof messaging);
      }
    } else {
      console.error('❌ [BackgroundHandler] Messaging module is null or undefined');
    }
    return false;
  } catch (error: any) {
    // Log errors for debugging, but don't fail app startup
    if (error?.message?.includes('NativeEventEmitter') || 
        error?.message?.includes('non-null') ||
        error?.message?.includes('requires a non-null')) {
      console.warn('⚠️ [BackgroundHandler] Native modules not ready (NativeEventEmitter error)');
    } else {
      console.error('❌ [BackgroundHandler] Could not set up Firebase background message handler:', error?.message || error);
      if (error?.stack) {
        console.error('❌ [BackgroundHandler] Stack trace:', error.stack.substring(0, 300));
      }
    }
    return false;
  }
}

// Use a longer delay to ensure React Native bridge is fully initialized
// Retry multiple times with increasing delays
let retryCount = 0;
const maxRetries = 5;

function trySetupBackgroundHandler() {
  console.log(`📨 [BackgroundHandler] Retry attempt ${retryCount + 1}/${maxRetries}`);
  const success = setupFirebaseBackgroundHandler();
  if (!success && retryCount < maxRetries) {
    retryCount++;
    const delay = retryCount * 2000; // 2s, 4s, 6s, 8s, 10s
    console.log(`⏳ [BackgroundHandler] Will retry in ${delay}ms...`);
    setTimeout(trySetupBackgroundHandler, delay);
  } else if (!success) {
    console.error('❌ [BackgroundHandler] Failed to set up background handler after all retries');
  }
}

// Start trying after initial delay (reduced since initialization is improved)
console.log('📨 [BackgroundHandler] Scheduling background handler setup in 3 seconds...');
setTimeout(trySetupBackgroundHandler, 3000);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
