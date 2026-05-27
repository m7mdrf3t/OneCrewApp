# How to Test Push Notifications - Quick Guide

## ⚠️ Important: Getting FCM Token (Not Expo Token)

If you see `ExponentPushToken[...]` instead of an FCM token, you're getting an Expo token. The code has been updated to:
1. Clear any old Expo tokens
2. Get a fresh FCM token directly from Firebase
3. Log it for testing

**The updated code in `App.tsx` will automatically:**
- Detect and clear old Expo tokens
- Get a fresh FCM token from Firebase
- Log it with clear formatting

Just run the app and check the console logs after 5 seconds.

---

## 🚀 Quick Start (3 Steps)

### Step 1: Get Your FCM Token

**Option A: Check Console Logs (Easiest)**
1. Run your app on a **physical iOS device** (push notifications don't work on simulator)
2. Log in to the app
3. Check your Xcode console or Metro bundler logs
4. Look for: `📱 [Token] FCM token received:` or `✅ [Token] Token stored successfully`
5. Copy the token (it's a long string starting with letters/numbers)

**Option B: Add Temporary Code to Log Token**
Add this to your `App.tsx` temporarily (in the `AppContent` component):

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
        // Try to register if no token exists
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
  
  // Wait a few seconds for Firebase to initialize
  setTimeout(logToken, 5000);
}, []);
```

---

### Step 2: Send Test Notification via Firebase Console

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project

2. **Navigate to Cloud Messaging**
   - In the left sidebar, click **"Engage"** → **"Cloud Messaging"**
   - Or go directly to: `https://console.firebase.google.com/project/YOUR_PROJECT_ID/notification`

3. **Send Test Message**
   - Click **"Send your first message"** or **"New notification"**
   - Enter:
     - **Notification title**: "Test Notification"
     - **Notification text**: "Testing push notifications"
   - Click **"Next"**

4. **Select Target**
   - Choose **"Single device"**
   - Paste your FCM token from Step 1
   - Click **"Test"**

5. **Send**
   - Review the message
   - Click **"Send test message"**

---

### Step 3: Verify It Works

**Test in 3 App States:**

#### ✅ Test 1: App in Foreground (App is open)
- Keep the app open and visible
- Send the test notification
- **Expected**: Banner appears at top of screen
- **Check logs**: Should see `📨 Notification received in foreground:`

#### ✅ Test 2: App in Background (App minimized)
- Press home button to minimize app
- Send the test notification
- **Expected**: Notification appears in iOS notification center
- Tap the notification
- **Expected**: App opens
- **Check logs**: Should see `👆 Notification tapped (app in background):`

#### ✅ Test 3: App Closed (Force quit)
- Force close the app (swipe up in app switcher)
- Send the test notification
- **Expected**: Notification appears in iOS notification center
- Tap the notification
- **Expected**: App launches
- **Check logs**: Should see `📱 App opened from notification:`

---

## 🔍 What to Look For in Logs

### Success Indicators:
```
✅ [Firebase] Firebase initialized successfully
✅ [Firebase] Messaging instance created
✅ [Permissions] iOS notification permissions granted
✅ [Token] FCM token received: ...
✅ [Token] Token stored successfully
📨 Notification received in foreground: {...}
```

### Error Indicators:
```
❌ [Firebase] Firebase configured but app instance is nil
❌ [APNs] Failed to register for remote notifications
❌ [Token] Failed to get FCM token
⚠️ [Token] Push notifications only work on physical devices
```

---

## 🐛 Troubleshooting

### Issue: No Token Generated

**Check:**
1. ✅ App is running on **physical device** (not simulator)
2. ✅ User is **logged in** (token registration happens after login)
3. ✅ Notification **permissions granted** (check iOS Settings → Your App → Notifications)
4. ✅ Firebase is properly configured (check `GoogleService-Info.plist` exists in Xcode)

**Debug:**
- Check Xcode console for Firebase initialization logs
- Look for: `🔥 [Firebase] Starting Firebase initialization...`
- Verify: `✅ [Firebase] Firebase initialized successfully`

---

### Issue: Token Generated But Notifications Not Received

**Check:**
1. ✅ Token is **valid** (not expired, correct format)
2. ✅ Token is **registered with backend** (check logs: `✅ Push token registered successfully`)
3. ✅ **APNs key uploaded** to Firebase Console
   - Go to: Firebase Console → Project Settings → Cloud Messaging
   - Check "Apple app configuration" section
   - Verify APNs Authentication Key or Certificate is uploaded
4. ✅ Device has **internet connection**
5. ✅ App has **notification permissions** (iOS Settings)

**Debug:**
- Check Firebase Console → Cloud Messaging → Reports
- Look for delivery failures
- Check if token is invalid or expired

---

### Issue: Notifications Received But Not Displayed

**Check:**
1. ✅ Notification permissions are granted
2. ✅ Device is not in "Do Not Disturb" mode
3. ✅ Notification settings in iOS Settings → Your App → Notifications
4. ✅ App is not in silent mode

---

## 📱 Testing with Backend API

If your backend has a push notification endpoint, you can test via API:

```bash
# Replace with your actual values
curl -X POST https://your-backend.com/api/push/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "token": "YOUR_FCM_TOKEN_FROM_STEP_1",
    "notification": {
      "title": "Test from Backend",
      "body": "Testing push notifications via API"
    },
    "data": {
      "type": "test",
      "custom_field": "value"
    }
  }'
```

---

## 🎯 Quick Checklist

Before testing, ensure:
- [ ] App is running on **physical iOS device**
- [ ] User is **logged in**
- [ ] **FCM token** is generated (check logs)
- [ ] Token is **registered with backend** (check logs)
- [ ] **Notification permissions** granted
- [ ] **Firebase configured** correctly
- [ ] **APNs key** uploaded to Firebase Console
- [ ] Device has **internet connection**

---

## 📊 Expected Console Output

### When Token is Generated:
```
📱 [Token] Starting push notification registration...
📱 [Token] Requesting permissions...
✅ [Permissions] iOS notification permissions granted
📱 [Token] Getting FCM token from Firebase...
📱 [Token] FCM token received: abc123...
✅ [Token] Token stored successfully
```

### When Notification Arrives (Foreground):
```
📨 Notification received in foreground: {
  notification: {
    title: 'Test Notification',
    body: 'Testing push notifications'
  },
  data: {}
}
```

### When Notification is Tapped:
```
👆 Notification tapped (app in background): {
  notification: {
    title: 'Test Notification',
    body: 'Testing push notifications'
  },
  data: {}
}
```

---

## 🎉 Success!

You'll know it's working when:
- ✅ FCM token is generated (check logs)
- ✅ Token is registered with backend
- ✅ Notifications appear in all app states (foreground, background, closed)
- ✅ Tapping notifications opens app correctly
- ✅ No errors in console logs

---

## 📝 Next Steps

1. **Test all scenarios** (foreground, background, closed)
2. **Test with real backend** notifications (if available)
3. **Test notification navigation** (if your app handles `data.type`)
4. **Remove temporary logging code** (if you added any)

---

## 💡 Pro Tips

1. **Keep Xcode console open** to see all logs in real-time
2. **Use Firebase Console** for easiest testing (no backend needed)
3. **Test on physical device** - simulators don't support push notifications
4. **Check notification permissions** in iOS Settings if notifications don't appear
5. **Monitor Firebase Console** → Cloud Messaging → Reports for delivery statistics

---

## 🔗 Related Files

- `src/services/PushNotificationService.ts` - Push notification service
- `ios/Steps/AppDelegate.swift` - iOS native notification handling
- `App.tsx` - Notification listeners and navigation
- `src/contexts/ApiContext.tsx` - Token registration with backend

---

**Need Help?** Check the detailed guides:
- `PUSH_NOTIFICATION_TESTING.md` - Detailed testing guide
- `NOTIFICATION_TESTING_GUIDE.md` - What to expect when backend sends notifications
- `FIREBASE_PUSH_NOTIFICATION_FIXES.md` - Troubleshooting guide

