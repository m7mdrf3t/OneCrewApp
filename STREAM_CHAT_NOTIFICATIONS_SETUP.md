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
- ✅ Device tokens are now registered with Stream Chat (StreamChatService.registerDeviceForPush + ApiContext + StreamChatProvider)

When the app connects to Stream Chat or registers an FCM token with the backend, it also registers the same token with Stream Chat so Stream can send push when new messages arrive (e.g. message from simulator → push on physical iOS device).

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

## 📱 Simulator → Physical iOS Device (message sent from simulator, push on device)

For the **recipient** (physical device) to get a push when the **sender** (simulator) sends a message:

1. **Physical device** must have the app installed, be logged in as the recipient, and have granted notification permission.
2. **Stream Chat Dashboard** must have **APNs** configured (Step 2 above): upload the `.p8` key, Key ID, and Team ID. Without this, Stream cannot deliver pushes to iOS.
3. **Firebase** (if your backend also sends FCM): upload APNs Authentication Key in Firebase Console → Project Settings → Cloud Messaging → Apple app configuration.
4. **Device registration**: The app now registers the FCM token with Stream when connecting and when registering with the backend. On the physical device, open the app once (or reopen) so Stream connects and the device is registered.
5. **Test**: Put the app in background or close it on the physical device, then send a message from the simulator; the device should receive a push.

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

