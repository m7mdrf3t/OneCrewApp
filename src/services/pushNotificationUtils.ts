import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import pushNotificationService from './PushNotificationService';
import streamChatService from './StreamChatService';

/**
 * Register an FCM/APNs push token with the OneCrew backend and Stream Chat.
 *
 * @param api     The initialised onecrew-api-client instance.
 * @param token   The device push token string.
 */
export const registerPushToken = async (api: any, token: string): Promise<void> => {
  try {
    console.log('    [Backend] Registering FCM token with backend using API client...');
    console.log('    [Backend] Token (first 20 chars):', token.substring(0, 20) + '...');
    console.log('    [FCM] Full token (copy for Firebase Console → Send test message):', token);

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';

    let deviceId: string | undefined = Device.modelName || undefined;
    if (!deviceId) {
      deviceId = (await AsyncStorage.getItem('@onecrew:device_id')) || undefined;
      if (!deviceId) {
        deviceId = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        await AsyncStorage.setItem('@onecrew:device_id', deviceId);
        console.log('    [Backend] Generated new device ID:', deviceId);
      } else {
        console.log('    [Backend] Using stored device ID:', deviceId);
      }
    } else {
      console.log('    [Backend] Using device model name:', deviceId);
    }

    const appVersion =
      Constants.expoConfig?.version ||
      (Constants as any).manifest2?.extra?.expoClient?.version ||
      '1.0.0';

    await api.pushNotifications.registerDeviceToken(token, platform, deviceId, appVersion);
    console.log('    [Backend] Push token registered successfully via API client');

    // Also register with Stream Chat for push
    if (streamChatService.isConnected()) {
      const streamToken =
        Platform.OS === 'ios'
          ? (await pushNotificationService.getAPNSToken()) || token
          : token;
      if (streamToken) {
        streamChatService.registerDeviceForPush(streamToken).catch(() => {});
      }
    }
  } catch (error: any) {
    // Non-critical — push registration failures must never block the auth flow
    if (error?.stack) {
      console.error('  [Backend] Stack trace:', error.stack.substring(0, 300));
    }
  }
};

/**
 * Attempt to initialise the push notification service and register the token,
 * retrying if FCM/APNs token is not yet available (common on first launch).
 *
 * @param registerFn      Bound `registerPushToken` caller (already has `api` bound).
 * @param isAuthenticated Returns whether the user is still authenticated — aborts if false.
 * @param maxAttempts     Default 4.
 * @param retryDelayMs    Delay between retry attempts in ms. Default 2 500.
 * @param initialDelayMs  Delay before the first attempt in ms. Default 500.
 */
export const initPushTokenWithRetry = (
  registerFn: (token: string) => Promise<void>,
  isAuthenticated: () => boolean,
  maxAttempts = 4,
  retryDelayMs = 2_500,
  initialDelayMs = 500
): void => {
  const attempt = async (n: number) => {
    if (!isAuthenticated()) return;
    try {
      const pushToken = await pushNotificationService.initialize();
      if (pushToken) {
        await registerFn(pushToken);
        return;
      }
    } catch (error) {
      console.error('  Failed to register push notifications:', error);
      return;
    }
    if (n < maxAttempts) {
      console.log(
        `    [Push] FCM token not ready yet (attempt ${n}/${maxAttempts}), retrying in ${retryDelayMs / 1_000}s...`
      );
      setTimeout(() => attempt(n + 1), retryDelayMs);
    } else {
      console.warn(
        `   [Push] Could not get FCM token after ${maxAttempts} attempts. Push may not work until next launch.`
      );
    }
  };

  setTimeout(() => attempt(1), initialDelayMs);
};
