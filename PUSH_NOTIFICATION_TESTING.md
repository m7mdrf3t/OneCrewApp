# Push Notification Testing Guide

## ✅ Current Status

Based on your logs, Firebase is now working correctly:
- ✅ Firebase messaging module loaded
- ✅ Messaging instance created
- ✅ Permissions granted
- ✅ Background handler registered
- ✅ Notification listeners set up

## 🧪 Testing Methods

### Method 1: Test via Firebase Console (Recommended)

1. **Get your FCM Token**
   - Check the console logs for: `📱 [Token] Using existing FCM token: ...`
   - Or add this to your app temporarily to log the token:
   ```typescript
   const token = await messaging().getToken();
   console.log('🔑 FCM Token:', token);
   ```

2. **Send Test Notification from Firebase Console**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Navigate to **Cloud Messaging** → **Send test message**
   - Paste your FCM token
   - Enter notification title and text
   - Click **Test**

### Method 2: Test via Backend API

If your backend has a push notification endpoint:

```bash
# Example curl command (adjust to your API)
curl -X POST https://your-backend.com/api/send-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "token": "YOUR_FCM_TOKEN",
    "title": "Test Notification",
    "body": "This is a test notification",
    "data": {
      "type": "test",
      "conversationId": "test-id"
    }
  }'
```

### Method 3: Test via Postman/API Client

1. **Get FCM Token from logs** (see Method 1)
2. **Send POST request to Firebase Cloud Messaging API**:
   ```
   POST https://fcm.googleapis.com/v1/projects/YOUR_PROJECT_ID/messages:send
   Headers:
     Authorization: Bearer YOUR_SERVER_KEY
     Content-Type: application/json
   Body:
   {
     "message": {
       "token": "YOUR_FCM_TOKEN",
       "notification": {
         "title": "Test Notification",
         "body": "This is a test from Postman"
       },
       "data": {
         "type": "chat_message",
         "conversationId": "test-id"
       }
     }
   }
   ```

### Method 4: Test via Your App's Backend

If your backend already has push notification functionality:

1. **Trigger a notification from your app**
   - Send a chat message to yourself
   - Create a test event that triggers a notification
   - Use any feature that should send a push notification

2. **Check the logs** for:
   - `📨 [App.tsx] Notification received in foreground:` (foreground)
   - `📨 [BackgroundHandler] Message handled in background:` (background)
   - `👆 [App.tsx] Notification tapped (app in background):` (tapped)

## 📱 Testing Scenarios

### Scenario 1: App in Foreground
1. Keep app open and visible
2. Send a test notification
3. **Expected**: Notification should appear in-app (check logs for `📨 [App.tsx] Notification received in foreground`)

### Scenario 2: App in Background
1. Press home button (app goes to background)
2. Send a test notification
3. **Expected**: Notification appears in notification center
4. **Check logs**: `📨 [BackgroundHandler] Message handled in background:`

### Scenario 3: App Closed (Terminated)
1. Force close the app (swipe up from app switcher)
2. Send a test notification
3. **Expected**: Notification appears in notification center
4. Tap the notification
5. **Expected**: App opens and navigates to relevant screen
6. **Check logs**: `👆 [App.tsx] Notification tapped (app in background):`

### Scenario 4: Notification Tap
1. Send a notification while app is in background
2. Tap the notification
3. **Expected**: 
   - App opens
   - Navigates to relevant screen (based on notification data)
   - Logs show: `👆 [App.tsx] Notification tapped (app in background):`

## 🔍 Debugging

### Check FCM Token
Add this to your app temporarily to see the token:

```typescript
// In App.tsx or any component
useEffect(() => {
  const getToken = async () => {
    try {
      const messaging = require('@react-native-firebase/messaging').default();
      const token = await messaging().getToken();
      console.log('🔑 FCM Token:', token);
      console.log('🔑 Token length:', token.length);
    } catch (error) {
      console.error('❌ Error getting token:', error);
    }
  };
  getToken();
}, []);
```

### Check Token Registration
Look for logs like:
- `📱 [ApiContext] Registering FCM token with backend: ...`
- `✅ [ApiContext] Push token registered successfully with backend`

### Monitor Logs
Watch for these log patterns:

**Success:**
- `✅ [Firebase] Successfully loaded Firebase messaging module`
- `✅ [Firebase] Messaging instance created successfully`
- `✅ [Permissions] iOS notification permissions granted`
- `✅ [Init] Successfully registered on attempt X`
- `✅ [BackgroundHandler] Firebase background message handler registered successfully`

**Errors:**
- `⚠️ [Firebase] Messaging module not available` - Module not loaded yet (retry will happen)
- `❌ [Firebase] Failed to initialize Firebase` - Check GoogleService-Info.plist
- `⚠️ [FCM] Could not get FCM token` - Check APNs configuration

## 🎯 Quick Test Checklist

- [ ] App builds and runs successfully
- [ ] Firebase module loads (check logs)
- [ ] Permissions are granted
- [ ] FCM token is generated
- [ ] Token is registered with backend
- [ ] Foreground notification received
- [ ] Background notification received
- [ ] Closed app notification received
- [ ] Notification tap opens app
- [ ] Notification tap navigates correctly

## 🐛 Common Issues

### Issue: Token is Expo Token, not FCM Token
**Symptom**: Logs show `ExponentPushToken[...]` instead of FCM token
**Solution**: This happens when using Expo. You need to ensure Firebase is properly configured. Check that:
- `GoogleService-Info.plist` is in the iOS project
- Firebase is initialized in `AppDelegate.swift`
- You're using `@react-native-firebase/messaging` not `expo-notifications`

### Issue: Notifications not received
**Check:**
1. FCM token is valid (not expired)
2. Token is registered with your backend
3. Backend is sending to correct FCM endpoint
4. APNs key is uploaded to Firebase Console
5. App has notification permissions

### Issue: Notifications received but not displayed
**Check:**
1. Notification permissions are granted
2. App is not in "Do Not Disturb" mode
3. Notification settings in iOS Settings app

## 📝 Next Steps

1. **Get your FCM token** from the logs
2. **Test with Firebase Console** (easiest method)
3. **Verify all scenarios** (foreground, background, closed)
4. **Test with real backend** notifications
5. **Monitor logs** for any issues

## 🎉 Success Indicators

You'll know it's working when:
- ✅ FCM token is generated (not Expo token)
- ✅ Token is registered with backend
- ✅ Notifications appear in all app states
- ✅ Tapping notifications opens app correctly
- ✅ No errors in console logs





