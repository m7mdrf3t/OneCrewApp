# Stream Chat Push Notifications Setup

## 🔔 Why No Notifications?

Stream Chat can send push notifications, but they need to be configured in:
1. **Stream Chat Dashboard** - Enable push notifications
2. **Backend** - Configure APNs (iOS) and FCM (Android) credentials
3. **Frontend** - Register device tokens with Stream Chat

## 📱 Setup Steps

### Step 1: Configure in Stream Chat Dashboard

1. Go to: https://dashboard.getstream.io/
2. Select your app (API Key: `j8yy2mzarh3n`)
3. Navigate to **Settings** → **Push Notifications**
4. Enable **Push Notifications**

### Step 2: Configure iOS (APNs)

1. **Get APNs Key from Apple Developer:**
   - Go to: https://developer.apple.com/account/resources/authkeys/list
   - Create a new key with **Apple Push Notifications service (APNs)** enabled
   - Download the `.p8` file
   - Note the **Key ID** and **Team ID**

2. **Upload to Stream Chat Dashboard:**
   - Go to Stream Chat Dashboard → **Settings** → **Push Notifications** → **iOS**
   - Upload the `.p8` file
   - Enter **Key ID** and **Team ID**
   - Click **Save**

### Step 3: Configure Android (FCM)

1. **Get FCM Server Key:**
   - Go to: https://console.firebase.google.com/
   - Select your Firebase project
   - Go to **Project Settings** → **Cloud Messaging**
   - Copy the **Server Key**

2. **Upload to Stream Chat Dashboard:**
   - Go to Stream Chat Dashboard → **Settings** → **Push Notifications** → **Android**
   - Paste the **Server Key**
   - Click **Save**

### Step 4: Backend Configuration (Optional)

If you want to send notifications from backend:

```typescript
// Backend: When a message is sent
import StreamChatService from '../services/streamChatService';

const streamClient = StreamChatService.getClient();
const channel = streamClient.channel('messaging', channelId);

// Send message (this will trigger push notifications automatically)
await channel.sendMessage({
  text: messageText,
  user: { id: userId },
});
```

### Step 5: Frontend Device Token Registration

Stream Chat automatically handles device token registration when:
1. User is connected to Stream Chat
2. Device has push notification permissions
3. FCM/APNs tokens are available

**Current Status:**
- ✅ Firebase is configured in frontend
- ✅ Push notification service is initialized
- ⚠️ Need to register device tokens with Stream Chat

**To register device token with Stream Chat:**

```typescript
// In StreamChatProvider or after user connects
import messaging from '@react-native-firebase/messaging';

// Get FCM token
const fcmToken = await messaging().getToken();

// Register with Stream Chat
await client.addDevice({
  id: fcmToken,
  push_provider: Platform.OS === 'ios' ? 'apn' : 'fcm',
});
```

## 🔍 Testing Notifications

### Test from Stream Chat Dashboard

1. Go to Stream Chat Dashboard → **Chat** → **Channels**
2. Select a channel
3. Click **Send Test Message**
4. Check if notification is received on device

### Test from App

1. Send a message from one device
2. Close the app on the other device (or put it in background)
3. Notification should appear
4. Tap notification → App opens to chat

## ⚠️ Important Notes

1. **Notifications only work when app is in background/closed**
   - Foreground notifications are handled by the app UI
   - Stream Chat shows messages in real-time when app is open

2. **Device tokens must be registered**
   - Stream Chat needs to know where to send notifications
   - Tokens are registered when user connects

3. **Permissions required**
   - iOS: User must grant notification permissions
   - Android: Permissions granted automatically (Android 12+)

## 🚨 Troubleshooting

### No Notifications Received

1. **Check Stream Chat Dashboard:**
   - Push notifications enabled?
   - APNs/FCM credentials uploaded?
   - Device tokens registered?

2. **Check Device:**
   - Notification permissions granted?
   - App in background/closed?
   - Device connected to internet?

3. **Check Backend:**
   - Stream Chat credentials correct?
   - Messages being sent to Stream Chat?

### Notifications Not Appearing

1. **iOS:**
   - Check APNs key is uploaded
   - Verify bundle ID matches
   - Check device has notification permissions

2. **Android:**
   - Check FCM server key is uploaded
   - Verify package name matches
   - Check Firebase is configured

## 📝 Quick Checklist

- [ ] Stream Chat Dashboard: Push notifications enabled
- [ ] iOS: APNs key uploaded to Stream Chat
- [ ] Android: FCM server key uploaded to Stream Chat
- [ ] Frontend: Device tokens registered with Stream Chat
- [ ] Backend: Messages sent to Stream Chat channels
- [ ] Test: Send message → Notification received

## 🎯 For Now (Testing)

**Notifications are optional for basic chat functionality.** You can:
1. Test chat messaging without notifications
2. Set up notifications later for production
3. Focus on fixing channel creation first (more critical)

The main issue right now is the **404 error** and **channel not available** - fix those first, then add notifications.

