# Notification Permission & Testing Guide

## 📱 What Notification Appears When Users Install the App?

### iOS Permission Dialog

When users first install and open your app, **iOS will automatically show a system permission dialog** asking for notification permissions. This happens when the app calls `requestPermissions()`.

**The dialog looks like this:**

```
┌─────────────────────────────────────┐
│  "OneCrew" Would Like to Send      │
│  You Notifications                  │
│                                     │
│  Notifications may include alerts,  │
│  sounds, and icon badges.          │
│                                     │
│  [Don't Allow]    [Allow]           │
└─────────────────────────────────────┘
```

**When it appears:**
- First time the app runs after installation
- When `registerForPushNotifications()` is called (happens automatically after login)
- Only once per device (unless user manually resets permissions in iOS Settings)

**What happens:**
1. User taps "Allow" → App gets notification permissions
2. User taps "Don't Allow" → App cannot send notifications (user can enable later in iOS Settings)

---

## 🧪 How to Test Notifications Between Two Devices/Apps

### Method 1: Using Firebase Console (Easiest - No Backend Needed)

**Step 1: Get FCM Tokens from Both Devices**

**Device 1:**
1. Install and run the app on Device 1
2. Log in to the app
3. Check console logs for: `🔑 YOUR FCM TOKEN FOR TESTING:`
4. Copy the token (long alphanumeric string)

**Device 2:**
1. Install and run the app on Device 2
2. Log in to the app
3. Check console logs for: `🔑 YOUR FCM TOKEN FOR TESTING:`
4. Copy the token

**Step 2: Send Notification from Firebase Console**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Engage** → **Cloud Messaging**
4. Click **"Send your first message"** or **"New notification"**
5. Enter:
   - **Notification title**: "Test from Device 1"
   - **Notification text**: "Testing push notifications"
6. Click **"Next"**
7. Select **"Single device"**
8. Paste Device 2's FCM token
9. Click **"Test"** → **"Send test message"**

**Result:** Device 2 will receive the notification!

---

### Method 2: Using Your Backend API (Recommended for Real Testing)

If your backend has a push notification endpoint, you can send notifications programmatically:

**Step 1: Get FCM Tokens from Both Devices**
- Same as Method 1, Step 1

**Step 2: Send Notification via Backend API**

```bash
# Example: Send notification from Device 1 to Device 2
curl -X POST https://onecrew-backend-309236356616.us-central1.run.app/api/push/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "token": "DEVICE_2_FCM_TOKEN",
    "notification": {
      "title": "Test from Device 1",
      "body": "This is a test notification"
    },
    "data": {
      "type": "test",
      "sender_id": "device_1_user_id"
    }
  }'
```

**Or use your app's chat/messaging feature:**
- If your app has chat, send a message from Device 1 to Device 2
- The backend should automatically send a push notification to Device 2

---

### Method 3: Direct Firebase API (Advanced)

You can send notifications directly using Firebase's REST API:

**Step 1: Get Firebase Server Key**
1. Go to Firebase Console → Project Settings → Cloud Messaging
2. Copy the **Server Key** (or use a service account)

**Step 2: Send Notification**

```bash
curl -X POST https://fcm.googleapis.com/v1/projects/YOUR_PROJECT_ID/messages:send \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "token": "DEVICE_2_FCM_TOKEN",
      "notification": {
        "title": "Test Notification",
        "body": "Testing from Device 1"
      },
      "data": {
        "type": "test",
        "sender": "device_1"
      }
    }
  }'
```

---

### Method 4: Create a Simple Test Script

Create a test script to send notifications between devices:

**File: `test-send-notification.js`**

```javascript
/**
 * Test script to send push notifications between devices
 * 
 * Usage:
 * 1. Get FCM tokens from both devices (check console logs)
 * 2. Update DEVICE_1_TOKEN and DEVICE_2_TOKEN below
 * 3. Run: node test-send-notification.js
 */

const fetch = require('node-fetch'); // or use built-in fetch in Node 18+

// Replace with actual FCM tokens from your devices
const DEVICE_1_TOKEN = 'YOUR_DEVICE_1_FCM_TOKEN';
const DEVICE_2_TOKEN = 'YOUR_DEVICE_2_FCM_TOKEN';

// Firebase project configuration
const FIREBASE_PROJECT_ID = 'YOUR_PROJECT_ID';
const FIREBASE_ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN'; // Get from Firebase Console

async function sendNotification(toToken, title, body, data = {}) {
  const url = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`;
  
  const payload = {
    message: {
      token: toToken,
      notification: {
        title: title,
        body: body,
      },
      data: data,
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIREBASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Notification sent successfully:', result);
    } else {
      console.error('❌ Failed to send notification:', result);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    throw error;
  }
}

// Test: Send from Device 1 to Device 2
console.log('📤 Sending notification from Device 1 to Device 2...');
sendNotification(
  DEVICE_2_TOKEN,
  'Test from Device 1',
  'This is a test notification sent from Device 1',
  {
    type: 'test',
    sender: 'device_1',
    timestamp: new Date().toISOString(),
  }
).then(() => {
  console.log('✅ Test notification sent!');
});

// Test: Send from Device 2 to Device 1
console.log('📤 Sending notification from Device 2 to Device 1...');
sendNotification(
  DEVICE_1_TOKEN,
  'Test from Device 2',
  'This is a test notification sent from Device 2',
  {
    type: 'test',
    sender: 'device_2',
    timestamp: new Date().toISOString(),
  }
).then(() => {
  console.log('✅ Test notification sent!');
});
```

---

## 📋 Quick Testing Checklist

### Before Testing:
- [ ] Both devices have the app installed
- [ ] Both devices are logged in
- [ ] Both devices have notification permissions granted
- [ ] You have FCM tokens from both devices
- [ ] Both devices are connected to the internet

### Testing Scenarios:

**Scenario 1: App in Foreground**
- [ ] Device 2 has app open and visible
- [ ] Send notification from Device 1
- [ ] **Expected:** Notification banner appears at top of screen on Device 2
- [ ] Check logs: `📨 Notification received in foreground:`

**Scenario 2: App in Background**
- [ ] Device 2 has app minimized (home button pressed)
- [ ] Send notification from Device 1
- [ ] **Expected:** Notification appears in iOS notification center
- [ ] Tap notification
- [ ] **Expected:** App opens
- [ ] Check logs: `👆 Notification tapped (app in background):`

**Scenario 3: App Closed**
- [ ] Device 2 has app force-closed
- [ ] Send notification from Device 1
- [ ] **Expected:** Notification appears in iOS notification center
- [ ] Tap notification
- [ ] **Expected:** App launches
- [ ] Check logs: `📱 App opened from notification:`

---

## 🔍 How to Get FCM Tokens

### Option 1: Check Console Logs (Automatic)

The app automatically logs FCM tokens. Look for:

```
🔑 ==========================================
🔑 YOUR FCM TOKEN FOR TESTING:
🔑 abc123def456ghi789...
🔑 ==========================================
```

### Option 2: Add Temporary Logging Code

Add this to `App.tsx` temporarily:

```typescript
useEffect(() => {
  const logToken = async () => {
    try {
      const token = await pushNotificationService.getStoredToken();
      if (token) {
        console.log('\n🔑 ==========================================');
        console.log('🔑 YOUR FCM TOKEN FOR TESTING:');
        console.log('🔑', token);
        console.log('🔑 ==========================================\n');
      } else {
        const newToken = await pushNotificationService.registerForPushNotifications();
        if (newToken) {
          console.log('\n🔑 ==========================================');
          console.log('🔑 YOUR FCM TOKEN FOR TESTING:');
          console.log('🔑', newToken);
          console.log('🔑 ==========================================\n');
        }
      }
    } catch (error) {
      console.error('❌ Error getting token:', error);
    }
  };
  
  setTimeout(logToken, 5000);
}, []);
```

---

## 🎯 Testing Real App Features

### Test Chat Notifications:
1. Device 1: Send a chat message to Device 2's user
2. Device 2: Should receive push notification
3. Device 2: Tap notification → Should open chat

### Test Project Notifications:
1. Device 1: Create a project and add Device 2's user
2. Device 2: Should receive push notification
3. Device 2: Tap notification → Should open project detail

### Test Task Notifications:
1. Device 1: Assign a task to Device 2's user
2. Device 2: Should receive push notification
3. Device 2: Tap notification → Should open project/task

---

## 🐛 Troubleshooting

### Issue: Permission Dialog Not Appearing

**Check:**
- [ ] App is running on physical device (not simulator)
- [ ] User is logged in (permission request happens after login)
- [ ] Check iOS Settings → Your App → Notifications (may already be granted/denied)

**Solution:**
- Reset permissions: iOS Settings → Your App → Notifications → Reset
- Reinstall app to trigger permission dialog again

### Issue: Notifications Not Received

**Check:**
- [ ] FCM token is valid (not expired)
- [ ] Token is registered with backend (check logs: `✅ Push token registered successfully`)
- [ ] APNs key uploaded to Firebase Console
- [ ] Device has internet connection
- [ ] Notification permissions granted

**Solution:**
- Check Firebase Console → Cloud Messaging → Reports for delivery failures
- Verify token format (should be long alphanumeric string, not starting with "ExponentPushToken")

---

## 📝 Summary

1. **On Install:** iOS shows system permission dialog asking "Allow notifications?"
2. **To Test:** Get FCM tokens from both devices, then use Firebase Console or backend API to send notifications
3. **Best Method:** Use Firebase Console for quick testing, or your backend API for real app feature testing

---

**Need Help?** Check these files:
- `HOW_TO_TEST_PUSH_NOTIFICATIONS.md` - Detailed testing guide
- `PUSH_NOTIFICATION_TESTING.md` - Testing scenarios
- `PUSH_NOTIFICATION_TROUBLESHOOTING.md` - Common issues and fixes












