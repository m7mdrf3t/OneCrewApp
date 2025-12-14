# Notification Testing Guide

## What You Should See When Backend Sends a Notification

---

## 📱 App States & Notification Behavior

### 1. **App in FOREGROUND (App is open and visible)**

**What You Should See:**
- ✅ **iOS**: Notification banner appears at the top of the screen
- ✅ **Android**: Notification appears in the notification tray
- ✅ **Console Log**: `📨 Notification received in foreground:`
- ✅ **Sound**: Notification sound plays (if configured)
- ✅ **Badge**: App icon badge updates (iOS)

**What Happens:**
1. Backend sends notification via Firebase
2. Firebase delivers to device
3. iOS AppDelegate's `willPresent` method shows it automatically
4. React Native `onMessage` listener logs it
5. Notification appears as banner/alert

**Test**: Keep app open, send notification from backend → Should see banner appear

---

### 2. **App in BACKGROUND (App is minimized/not visible)**

**What You Should See:**
- ✅ **Notification in System Tray**: Standard system notification
- ✅ **Console Log**: `📨 Message handled in background:` (when app resumes)
- ✅ **Sound**: Notification sound plays
- ✅ **Badge**: App icon badge updates

**What Happens:**
1. Backend sends notification
2. OS receives it and displays in notification tray
3. Background handler in `index.ts` processes it (logs when app resumes)
4. User can tap notification to open app

**Test**: Minimize app, send notification → Should see in notification tray

---

### 3. **App is CLOSED/QUIT (App not running)**

**What You Should See:**
- ✅ **Notification in System Tray**: Standard system notification
- ✅ **Console Log**: `📱 App opened from notification:` (when app opens)
- ✅ **Navigation**: App opens and navigates based on notification data

**What Happens:**
1. Backend sends notification
2. OS receives it and displays in notification tray
3. User taps notification
4. App launches
5. `getInitialNotification()` handles the tap
6. App navigates to relevant screen (if data.type is set)

**Test**: Force close app, send notification, tap notification → App should open

---

## 🔍 How to Verify Notifications Are Working

### Step 1: Check Token Registration

**Before sending notifications, verify:**
1. Open app and login
2. Check console logs for:
   ```
   📱 Registering FCM token with backend: ...
   ✅ Push token registered successfully
   ```
3. Check backend logs to confirm token was received

---

### Step 2: Send Test Notification from Backend

**Backend should send notification with this format:**

```json
{
  "notification": {
    "title": "Test Notification",
    "body": "This is a test message"
  },
  "data": {
    "type": "test",
    "custom_field": "value"
  },
  "token": "fcm_token_from_app"
}
```

**Or using Firebase Admin SDK:**
```javascript
const message = {
  notification: {
    title: 'Test Notification',
    body: 'This is a test message',
  },
  data: {
    type: 'test',
    custom_field: 'value',
  },
  token: fcmToken,
};

await admin.messaging().send(message);
```

---

### Step 3: Check What You See

#### **If App is Open (Foreground):**

**iOS:**
- ✅ Banner appears at top of screen
- ✅ Sound plays
- ✅ Console shows: `📨 Notification received in foreground:`
- ✅ Notification data is logged

**Android:**
- ✅ Notification appears in system tray
- ✅ Sound plays
- ✅ Console shows: `📨 Notification received in foreground:`

#### **If App is Minimized (Background):**

**Both Platforms:**
- ✅ Notification appears in system notification tray
- ✅ Sound plays
- ✅ Badge updates
- ✅ When you open app, console shows: `📨 Message handled in background:`

#### **If App is Closed:**

**Both Platforms:**
- ✅ Notification appears in system notification tray
- ✅ Sound plays
- ✅ When you tap notification:
  - App opens
  - Console shows: `📱 App opened from notification:`
  - App navigates based on `data.type` (if configured)

---

## 🐛 Troubleshooting

### Issue: No notification appears

**Check:**
1. ✅ Token is registered with backend (check logs)
2. ✅ Backend successfully sent notification (check Firebase Console → Cloud Messaging)
3. ✅ Device has notification permissions granted
4. ✅ App is running on **physical device** (not simulator/emulator)
5. ✅ Device is connected to internet
6. ✅ Firebase is properly configured (`GoogleService-Info.plist` in Xcode)

**Debug Steps:**
```bash
# Check console logs for:
- "📱 FCM token: ..." (token generated)
- "✅ Push token registered successfully" (token sent to backend)
- "📨 Notification received in foreground:" (notification received)
```

---

### Issue: Notification appears but no sound

**Check:**
1. Device volume is up
2. Device is not in silent/Do Not Disturb mode
3. Backend includes sound in notification payload:
   ```json
   {
     "apns": {
       "payload": {
         "aps": {
           "sound": "default"
         }
       }
     },
     "android": {
       "notification": {
         "sound": "default"
       }
     }
   }
   ```

---

### Issue: Notification appears but tap doesn't navigate

**Check:**
1. Notification payload includes `data.type` field
2. `data.type` matches one of the handled types:
   - `company_invitation`
   - `project_created`
   - `project_member_added`
   - `task_assigned`
   - `task_completed`
   - `message_received`
3. Console shows: `👆 Notification tapped:`
4. Check `handleNotificationNavigation` function in `App.tsx`

---

### Issue: Console shows errors

**Common Errors:**

1. **"Firebase not configured"**
   - Check `GoogleService-Info.plist` is in Xcode project
   - Verify Firebase is initialized in AppDelegate

2. **"Token not generated"**
   - Check device is physical (not simulator)
   - Check notification permissions are granted
   - Check Firebase configuration

3. **"Token registration failed"**
   - Check backend endpoint is correct
   - Check auth token is valid
   - Check network connectivity

---

## 📊 Expected Console Output

### When Notification Arrives (Foreground):

```
📨 Notification received in foreground: {
  notification: {
    title: 'Test Notification',
    body: 'This is a test message'
  },
  data: {
    type: 'test',
    custom_field: 'value'
  }
}
```

### When Notification is Tapped:

```
👆 Notification tapped (app in background): {
  notification: {
    title: 'Test Notification',
    body: 'This is a test message'
  },
  data: {
    type: 'test',
    custom_field: 'value'
  }
}
```

### When App Opens from Notification:

```
📱 App opened from notification: {
  notification: {
    request: {
      content: {
        title: 'Test Notification',
        body: 'This is a test message',
        data: {
          type: 'test',
          custom_field: 'value'
        }
      }
    }
  }
}
```

---

## ✅ Testing Checklist

### Before Testing:
- [ ] App is running on physical device
- [ ] User is logged in
- [ ] FCM token is registered with backend
- [ ] Notification permissions are granted
- [ ] Device is connected to internet

### Test Scenarios:

1. **Foreground Test:**
   - [ ] App is open
   - [ ] Send notification from backend
   - [ ] Notification banner appears
   - [ ] Console logs notification received
   - [ ] Sound plays (if configured)

2. **Background Test:**
   - [ ] Minimize app
   - [ ] Send notification from backend
   - [ ] Notification appears in system tray
   - [ ] Tap notification
   - [ ] App opens
   - [ ] Console logs notification tap

3. **Closed App Test:**
   - [ ] Force close app
   - [ ] Send notification from backend
   - [ ] Notification appears in system tray
   - [ ] Tap notification
   - [ ] App launches
   - [ ] Console logs app opened from notification
   - [ ] App navigates (if data.type is set)

4. **Navigation Test:**
   - [ ] Send notification with `data.type: "message_received"`
   - [ ] Tap notification
   - [ ] App should navigate to chat screen

---

## 🎯 Quick Test Command

**From Backend (using curl or Postman):**

```bash
# Replace with your actual FCM token and backend endpoint
curl -X POST https://your-backend.com/api/push/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "token": "FCM_TOKEN_FROM_APP",
    "notification": {
      "title": "Test Notification",
      "body": "Testing push notifications"
    },
    "data": {
      "type": "test"
    }
  }'
```

**Or use Firebase Console:**
1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter title and body
4. Select "Single device"
5. Enter FCM token from app logs
6. Click "Send test message"

---

## Summary

**Yes, you should see notifications!** Here's what to expect:

- ✅ **Foreground**: Banner/alert appears on screen
- ✅ **Background**: Notification in system tray
- ✅ **Closed**: Notification in system tray, app opens when tapped
- ✅ **Console**: Logs show notification received/tapped
- ✅ **Navigation**: App navigates based on `data.type` (if configured)

If you don't see notifications, check the troubleshooting section above!




