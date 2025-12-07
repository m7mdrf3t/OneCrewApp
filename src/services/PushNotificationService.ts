import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_TOKEN_KEY = '@onecrew:push_token';
const NOTIFICATION_PERMISSION_KEY = '@onecrew:push_permission';

/**
 * Push Notification Service
 * 
 * Handles push notification registration, permissions, and token management.
 * Integrates with Expo's notification system and stores tokens for backend registration.
 */
class PushNotificationService {
  private token: string | null = null;
  private isInitialized = false;

  /**
   * Configure notification behavior
   */
  configure() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.warn('⚠️ Push notifications only work on physical devices');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Notification permissions not granted');
        await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'denied');
        return false;
      }

      await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'granted');
      console.log('✅ Notification permissions granted');
      return true;
    } catch (error) {
      console.error('❌ Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Register for push notifications and get token
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if device is physical
      if (!Device.isDevice) {
        console.warn('⚠️ Push notifications only work on physical devices');
        return null;
      }

      // Request permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      // Get existing token if available
      const existingToken = await this.getStoredToken();
      if (existingToken) {
        console.log('📱 Using existing push token');
        this.token = existingToken;
        return existingToken;
      }

      // Get project ID from EAS config
      const projectId = 'bcee7258-fd98-44a4-b91e-6dd89f4ebf96'; // From app.json

      // Register for push notifications
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      const token = tokenData.data;
      console.log('📱 Push notification token:', token);

      // Store token
      await AsyncStorage.setItem(NOTIFICATION_TOKEN_KEY, token);
      this.token = token;

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
      }

      return token;
    } catch (error: any) {
      // Handle iOS-specific errors gracefully
      const errorMessage = error?.message || String(error);
      
      // Check for common iOS push notification errors that occur in development
      if (
        errorMessage.includes('aps-environment') ||
        errorMessage.includes('entitlement') ||
        errorMessage.includes('Expo Go') ||
        errorMessage.includes('development build')
      ) {
        console.warn(
          '⚠️ Push notifications not available:',
          Platform.OS === 'ios' 
            ? 'iOS push notifications require a standalone build with proper entitlements. This is expected in Expo Go or development builds without proper credentials.'
            : 'Push notifications require proper configuration.'
        );
        return null;
      }
      
      // Log other errors but don't fail the app
      console.error('❌ Error registering for push notifications:', error);
      return null;
    }
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
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('❌ Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<string | null> {
    if (this.isInitialized) {
      return this.token;
    }

    this.configure();
    const token = await this.registerForPushNotifications();
    this.isInitialized = true;
    return token;
  }

  /**
   * Add notification received listener
   */
  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  /**
   * Add notification response listener (when user taps notification)
   */
  addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  /**
   * Remove notification listener
   */
  removeNotificationSubscription(subscription: Notifications.Subscription) {
    if (subscription && typeof subscription.remove === 'function') {
      subscription.remove();
    }
  }

  /**
   * Get notification badge count
   */
  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('❌ Error getting badge count:', error);
      return 0;
    }
  }

  /**
   * Set notification badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('❌ Error setting badge count:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error('❌ Error clearing notifications:', error);
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;

