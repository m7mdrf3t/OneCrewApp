/**
 * Quick Test Script for Push Notifications
 * 
 * This script helps you test push notifications by:
 * 1. Getting your FCM token
 * 2. Providing instructions to send a test notification
 * 
 * Usage: Add this to your App.tsx temporarily to test
 */

// Add this to your App.tsx in a useEffect to test:

/*
import { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';

useEffect(() => {
  const testPushNotification = async () => {
    try {
      // Get FCM token
      const token = await messaging().getToken();
      console.log('🔑 ==========================================');
      console.log('🔑 FCM TOKEN FOR TESTING:');
      console.log('🔑', token);
      console.log('🔑 ==========================================');
      console.log('');
      console.log('📋 TO TEST:');
      console.log('1. Copy the token above');
      console.log('2. Go to Firebase Console → Cloud Messaging → Send test message');
      console.log('3. Paste the token and send a test notification');
      console.log('');

      // Also log token details
      console.log('📊 Token Details:');
      console.log('  - Length:', token.length);
      console.log('  - Type:', token.startsWith('ExponentPushToken') ? 'Expo Token (⚠️ Wrong!)' : 'FCM Token (✅ Correct!)');
      console.log('  - First 20 chars:', token.substring(0, 20));
      console.log('');

    } catch (error) {
      console.error('❌ Error getting FCM token:', error);
    }
  };

  // Run after a delay to ensure Firebase is initialized
  setTimeout(() => {
    testPushNotification();
  }, 5000);
}, []);
*/

// Or use this simpler version that you can call from anywhere:

export const logFCMToken = async () => {
  try {
    const messaging = require('@react-native-firebase/messaging').default();
    const token = await messaging().getToken();
    
    console.log('\n🔑 ==========================================');
    console.log('🔑 FCM TOKEN FOR TESTING:');
    console.log('🔑', token);
    console.log('🔑 ==========================================\n');
    
    return token;
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
};















