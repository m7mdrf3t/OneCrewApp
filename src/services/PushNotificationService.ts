import * as Device from 'expo-device';
import { Platform, PermissionsAndroid, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const NOTIFICATION_TOKEN_KEY = '@onecrew:push_token';
const NOTIFICATION_PERMISSION_KEY = '@onecrew:push_permission';

// Record app start time for Firebase initialization delay
declare global {
  var __APP_START_TIME__: number | undefined;
}

if (typeof global !== 'undefined' && !global.__APP_START_TIME__) {
  global.__APP_START_TIME__ = Date.now();
}

/**
 * Safely get Firebase messaging module and instance
 * This prevents errors when native modules aren't ready yet
 * 
 * We use a lazy loading pattern with error handling to avoid triggering
 * NativeEventEmitter initialization before native modules are ready
 */
let messagingModuleCache: any = null;
let isMessagingModuleLoaded = false;
let lastLoadAttempt = 0;
const RETRY_DELAY_MS = 3000; // Retry after 3 seconds if previous attempt failed (reduced from 5s)
const MIN_APP_START_TIME = 2000; // Minimum time before trying to load Firebase (reduced from 5s to 2s)

function getMessagingModule() {
  // Return cached module if already loaded successfully
  if (isMessagingModuleLoaded && messagingModuleCache) {
    console.log('📦 [Firebase] Using cached messaging module');
    return messagingModuleCache;
  }

  // Check if enough time has passed since app start
  // This ensures native modules have time to initialize
  const now = Date.now();
  const timeSinceLastAttempt = now - lastLoadAttempt;
  
  // If we've tried and failed recently, don't try again immediately
  if (lastLoadAttempt > 0 && timeSinceLastAttempt < RETRY_DELAY_MS && !messagingModuleCache) {
    console.log(`⏳ [Firebase] Waiting before retry (${Math.round((RETRY_DELAY_MS - timeSinceLastAttempt) / 1000)}s remaining)`);
    return null;
  }

  // Ensure minimum time has passed since module load (app startup)
  // This gives native modules time to initialize
  if (lastLoadAttempt === 0) {
    // First attempt - check if we should wait
    const appStartTime = (typeof global !== 'undefined' && global.__APP_START_TIME__) ? global.__APP_START_TIME__ : 0;
    const timeSinceAppStart = now - appStartTime;
    if (timeSinceAppStart < MIN_APP_START_TIME) {
      // Too early - wait a bit
      console.log(`⏳ [Firebase] Too early to load module (${Math.round((MIN_APP_START_TIME - timeSinceAppStart) / 1000)}s since app start)`);
      return null;
    }
  }
  
  console.log('📦 [Firebase] Attempting to load Firebase messaging module...');

  // Note: NativeModules might be empty in Expo dev builds until bridge is fully ready
  // We'll just try to require the module and handle errors gracefully

  try {
    lastLoadAttempt = now;
    // Try to require the module - this may throw if native modules aren't ready
    let messagingModule: any;
    
    try {
      // Check if NativeModules is available
      console.log('📦 [Firebase] Checking NativeModules availability...');
      console.log('📦 [Firebase] NativeModules keys:', Object.keys(NativeModules || {}).length);
      
      // Try to require the module
      console.log('📦 [Firebase] Requiring @react-native-firebase/messaging...');
      messagingModule = require('@react-native-firebase/messaging');
      
      // Log what we got
      console.log('📦 [Firebase] Require result:', {
        isNull: messagingModule === null,
        isUndefined: messagingModule === undefined,
        type: typeof messagingModule,
        hasDefault: !!messagingModule?.default,
        keys: messagingModule ? Object.keys(messagingModule) : []
      });
      
    } catch (requireError: any) {
      // Handle errors during require
      const errorMessage = requireError?.message || '';
      const isNativeModuleError = 
        errorMessage.includes('NativeEventEmitter') || 
        errorMessage.includes('non-null') ||
        errorMessage.includes('requires a non-null');
      
      if (isNativeModuleError) {
        // Native modules aren't ready - this is expected during startup
        console.log('⏳ [Firebase] Native modules not ready yet, will retry later');
        lastLoadAttempt = 0;
        return null;
      }
      
      // Other errors should be logged
      console.error('❌ [Firebase] Error requiring Firebase messaging:', requireError?.message);
      console.error('❌ [Firebase] Error name:', requireError?.name);
      console.error('❌ [Firebase] Error code:', requireError?.code);
      if (requireError?.stack) {
        console.error('❌ [Firebase] Stack trace:', requireError.stack.substring(0, 500));
      }
      lastLoadAttempt = 0;
      return null;
    }
    
    if (!messagingModule) {
      console.error('❌ [Firebase] Messaging module is null or undefined after require');
      console.error('❌ [Firebase] This indicates the native module is not properly linked');
      console.error('❌ [Firebase] Possible causes:');
      console.error('   1. Native module not installed in iOS project');
      console.error('   2. Pods need to be reinstalled: cd ios && pod install');
      console.error('   3. App needs to be rebuilt: npx expo run:ios --device');
      console.error('   4. Module not properly configured in Expo config');
      lastLoadAttempt = 0;
      return null;
    }
    
    // Module loaded successfully
    if (!isMessagingModuleLoaded) {
      console.log('✅ [Firebase] Successfully loaded Firebase messaging module');
      console.log('📦 [Firebase] Module type:', typeof messagingModule);
      console.log('📦 [Firebase] Has default export:', !!messagingModule.default);
    }
    
    messagingModuleCache = messagingModule;
    isMessagingModuleLoaded = true;
    return messagingModule;
  } catch (error: any) {
    // Catch any unexpected errors
    const errorMessage = error?.message || '';
    const isNativeModuleError = 
      errorMessage.includes('NativeEventEmitter') || 
      errorMessage.includes('non-null') ||
      errorMessage.includes('requires a non-null');
    
    if (isNativeModuleError) {
      // Don't log this as it's expected during app startup
      lastLoadAttempt = 0;
      return null;
    }
    
    // Log unexpected errors
    console.error('❌ [Firebase] Unexpected error loading messaging module:', error?.message || error);
    if (error?.stack) {
      console.error('❌ [Firebase] Error stack:', error.stack.substring(0, 300));
    }
    if (error?.name) {
      console.error('❌ [Firebase] Error name:', error.name);
    }
    lastLoadAttempt = 0;
    return null;
  }
}

function getMessaging() {
  console.log('📦 [Firebase] Getting messaging instance...');
  const messagingModule = getMessagingModule();
  if (!messagingModule) {
    console.warn('⚠️ [Firebase] Messaging module not available');
    return null;
  }

  try {
    // Handle both default export and direct export
    const messaging = messagingModule.default || messagingModule;
    if (!messaging || typeof messaging !== 'function') {
      console.error('❌ [Firebase] Messaging is not a function. Type:', typeof messaging);
      return null;
    }
    
    console.log('📦 [Firebase] Calling messaging() to get instance...');
    // Try to get the messaging instance
    // This can throw if native modules aren't ready
    try {
      const instance = messaging();
      console.log('✅ [Firebase] Messaging instance created successfully');
      return instance;
    } catch (instanceError: any) {
      // If error is about NativeEventEmitter, native modules aren't ready
      if (instanceError?.message?.includes('NativeEventEmitter') || 
          instanceError?.message?.includes('non-null') ||
          instanceError?.message?.includes('requires a non-null')) {
        console.warn('⚠️ [Firebase] Native modules not ready (NativeEventEmitter error)');
        // Clear cache so we can retry later
        messagingModuleCache = null;
        isMessagingModuleLoaded = false;
        lastLoadAttempt = 0;
        return null;
      }
      console.error('❌ [Firebase] Error creating messaging instance:', instanceError?.message);
      throw instanceError;
    }
  } catch (error: any) {
    // If error is about NativeEventEmitter, native modules aren't ready
    if (error?.message?.includes('NativeEventEmitter') || 
        error?.message?.includes('non-null') ||
        error?.message?.includes('requires a non-null')) {
      console.warn('⚠️ [Firebase] Native modules not ready (NativeEventEmitter error)');
      // Clear cache so we can retry later
      messagingModuleCache = null;
      isMessagingModuleLoaded = false;
      lastLoadAttempt = 0;
      return null;
    }
    console.error('❌ [Firebase] Error getting Firebase messaging instance:', error?.message || error);
    if (error?.stack) {
      console.error('❌ [Firebase] Stack trace:', error.stack.substring(0, 300));
    }
    return null;
  }
}

/**
 * Push Notification Service
 * 
 * Handles push notification registration, permissions, and token management.
 * Integrates with Firebase Cloud Messaging (FCM) for both iOS and Android.
 */
class PushNotificationService {
  private token: string | null = null;
  private isInitialized = false;
  private tokenRefreshUnsubscribe: (() => void) | null = null;
  private onTokenRefreshCallback: ((token: string) => void) | null = null;

  /**
   * Configure notification behavior
   * Note: Firebase handles notification display automatically
   */
  configure() {
    // Firebase handles notification display automatically
    // No explicit configuration needed like Expo
    console.log('⚙️ [Firebase] Configuring Firebase Messaging...');
    console.log('✅ [Firebase] Firebase Messaging configured');
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      console.log('📱 [Permissions] Requesting notification permissions...');
      if (!Device.isDevice) {
        console.warn('⚠️ [Permissions] Push notifications only work on physical devices');
        return false;
      }

      if (Platform.OS === 'ios') {
        // iOS: Request permissions via Firebase
        console.log('📱 [Permissions] iOS: Requesting via Firebase...');
        const messagingInstance = getMessaging();
        if (!messagingInstance) {
          console.error('❌ [Permissions] Firebase messaging not available');
          return false;
        }
        const messagingModule = getMessagingModule();
        if (!messagingModule) {
          console.error('❌ [Permissions] Messaging module not available');
          return false;
        }
        const messaging = messagingModule.default || messagingModule;
        console.log('📱 [Permissions] Calling requestPermission()...');
        const authStatus = await messagingInstance.requestPermission();
        console.log('📱 [Permissions] Authorization status:', authStatus);
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'granted');
          console.log('✅ [Permissions] iOS notification permissions granted');
          return true;
        } else {
          await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'denied');
          console.warn('⚠️ [Permissions] iOS notification permissions not granted. Status:', authStatus);
          return false;
        }
      } else {
        // Android: Request runtime permissions (Android 13+)
        const androidVersion = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
        if (androidVersion >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Notification Permission',
              message: 'This app needs access to send you notifications.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );

          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'granted');
            console.log('✅ Android notification permissions granted');
            return true;
          } else {
            await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'denied');
            console.warn('⚠️ Android notification permissions not granted');
            return false;
          }
        } else {
          // Android < 13: Permissions granted by default
          await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'granted');
          console.log('✅ Android notification permissions (pre-13)');
          return true;
        }
      }
    } catch (error) {
      console.error('❌ Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Register for push notifications and get FCM token
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      console.log('📱 [Token] Starting push notification registration...');
      // Check if device is physical
      if (!Device.isDevice) {
        console.warn('⚠️ [Token] Push notifications only work on physical devices');
        return null;
      }

      // Request permissions first
      console.log('📱 [Token] Requesting permissions...');
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.error('❌ [Token] Permissions not granted, cannot get token');
        return null;
      }

      // Get existing token if available
      const existingToken = await this.getStoredToken();
      if (existingToken) {
        console.log('📱 [Token] Using existing FCM token:', existingToken.substring(0, 20) + '...');
        this.token = existingToken;
        return existingToken;
      }

      // Get FCM token
      console.log('📱 [Token] Getting FCM token from Firebase...');
      const messagingInstance = getMessaging();
      if (!messagingInstance) {
        console.error('❌ [Token] Firebase messaging not available');
        return null;
      }
      
      // Register device for remote messages (required for iOS)
      if (Platform.OS === 'ios') {
        try {
          console.log('📱 [Token] Registering device for remote messages (iOS)...');
          await messagingInstance.registerDeviceForRemoteMessages();
          console.log('✅ [Token] Device registered for remote messages');
        } catch (registerError: any) {
          // If already registered, this will throw - that's okay
          if (registerError?.message?.includes('already registered')) {
            console.log('📱 [Token] Device already registered for remote messages');
          } else {
            console.warn('⚠️ [Token] Error registering device (may already be registered):', registerError?.message);
          }
        }
      }
      
      console.log('📱 [Token] Calling getToken()...');
      const token = await messagingInstance.getToken();
      console.log('📱 [Token] FCM token received:', token ? token.substring(0, 20) + '...' : 'null');

      if (!token) {
        console.error('❌ [Token] Failed to get FCM token (token is null)');
        return null;
      }

      // Store token
      console.log('📱 [Token] Storing token in AsyncStorage...');
      await AsyncStorage.setItem(NOTIFICATION_TOKEN_KEY, token);
      this.token = token;
      console.log('✅ [Token] Token stored successfully');

      // Set up token refresh listener
      console.log('📱 [Token] Setting up token refresh listener...');
      this.setupTokenRefreshListener();
      console.log('✅ [Token] Token refresh listener set up');

      return token;
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      console.error('❌ [Token] Error registering for push notifications:', errorMessage);
      
      if (error?.stack) {
        console.error('❌ [Token] Stack trace:', error.stack.substring(0, 300));
      }
      
      // Handle common errors
      if (errorMessage.includes('messaging/unknown') || errorMessage.includes('network')) {
        console.error('❌ [Token] Network error or Firebase not configured. Please check Firebase setup.');
      }
      if (errorMessage.includes('messaging/registration-token-not-ready')) {
        console.error('❌ [Token] Registration token not ready. Firebase may not be initialized.');
      }
      if (errorMessage.includes('messaging/invalid-registration-token')) {
        console.error('❌ [Token] Invalid registration token. Check Firebase configuration.');
      }
      
      return null;
    }
  }

  /**
   * Set up token refresh listener
   */
  private setupTokenRefreshListener() {
    console.log('🔄 [TokenRefresh] Setting up token refresh listener...');
    if (this.tokenRefreshUnsubscribe) {
      console.log('🔄 [TokenRefresh] Unsubscribing from previous listener');
      this.tokenRefreshUnsubscribe();
    }

    const messagingInstance = getMessaging();
    if (!messagingInstance) {
      console.error('❌ [TokenRefresh] Firebase messaging not available for token refresh listener');
      return;
    }
    
    console.log('✅ [TokenRefresh] Registering onTokenRefresh listener...');
    this.tokenRefreshUnsubscribe = messagingInstance.onTokenRefresh(async (newToken: string) => {
      console.log('🔄 [TokenRefresh] FCM token refreshed:', newToken.substring(0, 20) + '...');
      await AsyncStorage.setItem(NOTIFICATION_TOKEN_KEY, newToken);
      this.token = newToken;
      console.log('✅ [TokenRefresh] New token stored');
      
      // Notify callback if set (for automatic re-registration with backend)
      if (this.onTokenRefreshCallback) {
        console.log('📱 [TokenRefresh] Triggering token refresh callback for backend re-registration');
        this.onTokenRefreshCallback(newToken);
      } else {
        console.warn('⚠️ [TokenRefresh] No callback registered for token refresh');
      }
    });
    console.log('✅ [TokenRefresh] Token refresh listener registered');
  }

  /**
   * Set callback to be called when token refreshes
   * This allows automatic re-registration with backend
   */
  setOnTokenRefreshCallback(callback: (token: string) => void) {
    this.onTokenRefreshCallback = callback;
    console.log('✅ Token refresh callback registered');
  }

  /**
   * Clear token refresh callback
   */
  clearTokenRefreshCallback() {
    this.onTokenRefreshCallback = null;
    console.log('🗑️ Token refresh callback cleared');
  }

  /**
   * Get stored push token
   */
  async getStoredToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(NOTIFICATION_TOKEN_KEY);
      return token;
    } catch (error) {
      console.error('❌ Error getting stored token:', error);
      return null;
    }
  }

  /**
   * Get current push token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Clear stored token (e.g., on logout)
   */
  async clearToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(NOTIFICATION_TOKEN_KEY);
      this.token = null;
      
      // Unsubscribe from token refresh
      if (this.tokenRefreshUnsubscribe) {
        this.tokenRefreshUnsubscribe();
        this.tokenRefreshUnsubscribe = null;
      }

      // Delete FCM token from Firebase
      try {
        const messagingInstance = getMessaging();
        if (messagingInstance) {
          await messagingInstance.deleteToken();
        }
        console.log('🗑️ FCM token deleted from Firebase');
      } catch (error) {
        console.warn('⚠️ Failed to delete FCM token from Firebase:', error);
      }

      console.log('🗑️ Push token cleared');
    } catch (error) {
      console.error('❌ Error clearing token:', error);
    }
  }

  /**
   * Check if permissions are granted
   */
  async checkPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const messagingInstance = getMessaging();
        if (!messagingInstance) {
          return false;
        }
        const messagingModule = getMessagingModule();
        if (!messagingModule) {
          return false;
        }
        const messaging = messagingModule.default || messagingModule;
        const authStatus = await messagingInstance.hasPermission();
        return (
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL
        );
      } else {
        const androidVersion = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
        if (androidVersion >= 33) {
          const granted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          return granted;
        } else {
          // Android < 13: Permissions granted by default
          return true;
        }
      }
    } catch (error) {
      console.error('❌ Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Initialize the service
   * Retries if Firebase is not ready yet
   */
  async initialize(): Promise<string | null> {
    console.log('🚀 [Init] Initializing PushNotificationService...');
    if (this.isInitialized && this.token) {
      console.log('✅ [Init] Service already initialized, returning existing token');
      return this.token;
    }
    
    // If service is initialized but token is null, try to get stored token or re-register
    if (this.isInitialized && !this.token) {
      console.log('⚠️ [Init] Service initialized but token is null, checking stored token...');
      const storedToken = await this.getStoredToken();
      if (storedToken) {
        console.log('✅ [Init] Found stored token, using it');
        this.token = storedToken;
        return storedToken;
      } else {
        console.log('⚠️ [Init] No stored token found, will re-register...');
        // Reset initialization flag to allow re-registration
        this.isInitialized = false;
      }
    }

    this.configure();
    
    // Retry logic: if Firebase isn't ready, wait and try again
    // Reduced to 2 retries since initialization is now more reliable
    let retries = 2;
    let token: string | null = null;
    
    console.log(`🔄 [Init] Starting registration with ${retries} retries...`);
    while (retries > 0 && !token) {
      const attemptNumber = 3 - retries;
      console.log(`🔄 [Init] Attempt ${attemptNumber + 1}/2: Registering for push notifications...`);
      try {
        token = await this.registerForPushNotifications();
        if (token) {
          console.log(`✅ [Init] Successfully registered on attempt ${attemptNumber + 1}`);
          break;
        } else {
          console.warn(`⚠️ [Init] Registration returned null on attempt ${attemptNumber + 1}`);
        }
      } catch (error: any) {
        console.error(`❌ [Init] Error on attempt ${attemptNumber + 1}:`, error?.message || error);
        const errorMessage = error?.message || '';
        const isNativeModuleError = 
          errorMessage.includes('NativeEventEmitter') || 
          errorMessage.includes('non-null') ||
          errorMessage.includes('requires a non-null');
        
        if (isNativeModuleError) {
          retries--;
          if (retries > 0) {
            // Wait before retrying (shorter delay)
            const delay = 2000; // 2 seconds
            console.log(`⏳ [Init] Native modules not ready, waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            console.error('❌ [Init] All retries exhausted due to NativeEventEmitter errors');
          }
        } else {
          // Other errors, don't retry
          console.error('❌ [Init] Non-retryable error:', error?.message || error);
          throw error;
        }
      }
      
      // If no token but no error, Firebase might not be ready
      if (!token && retries > 0) {
        retries--;
        const delay = 2000; // 2 seconds
        console.log(`⏳ [Init] No token received, waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    if (token) {
      console.log('✅ [Init] PushNotificationService initialized successfully');
      this.isInitialized = true;
    } else {
      console.error('❌ [Init] Failed to initialize PushNotificationService after all retries');
    }
    
    return token;
  }

  /**
   * Add notification received listener (foreground notifications)
   */
  addNotificationReceivedListener(
    listener: (notification: any) => void
  ): () => void {
    // Try to get messaging instance with retry logic
    let messagingInstance = getMessaging();
    
    if (!messagingInstance) {
      // If not available, set up a retry mechanism
      let unsubscribeFn: (() => void) | null = null;
      let retryCount = 0;
      const maxRetries = 5;
      
      const trySetup = () => {
        messagingInstance = getMessaging();
        if (messagingInstance) {
          unsubscribeFn = messagingInstance.onMessage(async (remoteMessage: any) => {
            console.log('📨 Notification received in foreground:', remoteMessage);
            
            // Convert Firebase message to a format similar to Expo notification
            const notification = {
              notification: {
                title: remoteMessage.notification?.title,
                body: remoteMessage.notification?.body,
              },
              data: remoteMessage.data || {},
            };
            
            listener(notification);
          });
        } else if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(trySetup, 2000 * retryCount); // Exponential backoff
        } else {
          console.warn('⚠️ Firebase messaging not available after retries, listener not set up');
        }
      };
      
      // Start retry after initial delay
      setTimeout(trySetup, 2000);
      
      // Return unsubscribe function that works even if not set up yet
      return () => {
        if (unsubscribeFn) {
          unsubscribeFn();
        }
      };
    }
    
    // If we have messaging instance, set up listener immediately
    return messagingInstance.onMessage(async (remoteMessage: any) => {
      console.log('📨 Notification received in foreground:', remoteMessage);
      
      // Convert Firebase message to a format similar to Expo notification
      const notification = {
        notification: {
          title: remoteMessage.notification?.title,
          body: remoteMessage.notification?.body,
        },
        data: remoteMessage.data || {},
      };
      
      listener(notification);
    });
  }

  /**
   * Add notification response listener (when user taps notification)
   * Note: This is handled differently in Firebase - we need to check initial notification
   */
  addNotificationResponseReceivedListener(
    listener: (response: any) => void
  ): () => void {
    // Firebase handles notification taps via getInitialNotification
    // This listener is set up in App.tsx to check for initial notifications
    // For background notifications, we use setBackgroundMessageHandler
    // For foreground notifications, we use onMessage
    
    // Return a no-op unsubscribe function for compatibility
    return () => {};
  }

  /**
   * Remove notification listener
   */
  removeNotificationSubscription(unsubscribe: (() => void) | null | undefined) {
    if (unsubscribe && typeof unsubscribe === 'function') {
      unsubscribe();
    }
  }

  /**
   * Get notification badge count (iOS only)
   */
  async getBadgeCount(): Promise<number> {
    try {
      if (Platform.OS === 'ios') {
        // Firebase doesn't have a direct badge count API
        // You would need to track this in your app state
        // For now, return 0
        return 0;
      }
      return 0;
    } catch (error) {
      console.error('❌ Error getting badge count:', error);
      return 0;
    }
  }

  /**
   * Set notification badge count (iOS only)
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        // Firebase doesn't have a direct badge count API
        // You would need to use a native module or track in app state
        // For now, just log
        console.log('📱 Badge count would be set to:', count);
      }
    } catch (error) {
      console.error('❌ Error setting badge count:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    try {
      // Firebase doesn't have a direct API to clear notifications
      // Notifications are managed by the OS
      console.log('📱 Clear notifications - handled by OS');
    } catch (error) {
      console.error('❌ Error clearing notifications:', error);
    }
  }

  /**
   * Set up background message handler
   * This must be called at the top level of the app (in index.ts)
   */
  setupBackgroundMessageHandler() {
    const messagingInstance = getMessaging();
    if (!messagingInstance) {
      console.warn('⚠️ Firebase messaging not available for background message handler');
      return;
    }
    messagingInstance.setBackgroundMessageHandler(async (remoteMessage: any) => {
      console.log('📨 Message handled in background:', remoteMessage);
      // Handle background notification here if needed
    });
  }

  /**
   * Get initial notification (when app is opened from a notification)
   */
  async getInitialNotification(): Promise<any | null> {
    try {
      const messagingInstance = getMessaging();
      if (!messagingInstance) {
        return null;
      }
      const remoteMessage = await messagingInstance.getInitialNotification();
      if (remoteMessage) {
        console.log('📱 App opened from notification:', remoteMessage);
        return {
          notification: {
            request: {
              content: {
                title: remoteMessage.notification?.title,
                body: remoteMessage.notification?.body,
                data: remoteMessage.data || {},
              },
            },
          },
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting initial notification:', error);
      return null;
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
