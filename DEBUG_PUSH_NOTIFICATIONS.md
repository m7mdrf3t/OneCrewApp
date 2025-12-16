# Debug Push Notifications - Next Steps

## ✅ What's Already Done
- ✅ APNs keys uploaded to Firebase (Development & Production)
- ✅ Device registered in Apple Developer account
- ✅ FCM token retrieved successfully
- ✅ Firebase initialized

## 🔍 Next Steps to Debug

### Step 1: Check APNs Token Registration

**Check Xcode Console Logs** when app starts:

Look for these logs:
```
📱 [APNs] APNs device token received
✅ [APNs] APNs token forwarded to Firebase
✅ [FCM] FCM token available: ...
```

**If you see**:
```
❌ [APNs] Failed to register for remote notifications: ...
```

**This means**: The app isn't receiving APNs token from Apple. This is usually because:
- Missing entitlements (Push Notifications capability)
- App not properly signed
- Entitlements file missing or incorrect

---

### Step 2: Verify Entitlements in Xcode

**Critical**: The app must have Push Notifications capability enabled.

1. **Open Xcode**: `ios/Steps.xcworkspace`
2. **Select your target** (Steps)
3. **Go to Signing & Capabilities tab**
4. **Check if "Push Notifications" capability is added**
   - If NOT: Click **+ Capability** → **Push Notifications**
5. **Check if "Background Modes" capability is added**
   - If NOT: Click **+ Capability** → **Background Modes**
   - Enable **Remote notifications** checkbox

**After adding capabilities**:
- **Rebuild the app**: `npx expo run:ios --device --clean`

---

### Step 3: Check Entitlements File

The entitlements file should exist and contain:

1. **In Xcode**, look for `Steps.entitlements` file in project navigator
2. **It should contain**:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
       <key>aps-environment</key>
       <string>development</string>
   </dict>
   </plist>
   ```

**For development builds**: Use `development`
**For production builds**: Use `production`

---

### Step 4: Check Firebase Console Reports

1. **Go to Firebase Console** → **Cloud Messaging**
2. **Click "Reports" tab**
3. **Look for delivery statistics**
4. **Check for errors** related to your token

**Common errors**:
- "Invalid registration token" - Token expired or invalid
- "MismatchSenderId" - Wrong Firebase project
- "Unregistered" - Token no longer valid

---

### Step 5: Test Notification Format

When sending from Firebase Console:

**Use "Send test message"**:
1. Go to **Cloud Messaging** → **Send test message**
2. Select **"Single device"**
3. Paste your FCM token: `fkAjPF4zYkmahmUFoIta9o:APA91bF...`
4. Enter title and body
5. Click **Test**

**Check the notification payload**:
- Should include `notification` object (for display)
- Can include `data` object (for app handling)

---

### Step 6: Verify App State

Test notifications in different app states:

1. **Foreground** (app open):
   - Keep app open and visible
   - Send notification
   - Should see banner at top

2. **Background** (app minimized):
   - Press home button
   - Send notification
   - Should appear in notification center

3. **Closed** (app terminated):
   - Force close app
   - Send notification
   - Should appear in notification center

---

## 🎯 Most Likely Remaining Issues

### Issue 1: Missing Entitlements ⚠️ **MOST COMMON**

**Symptom**: APNs token not received (check Xcode console)

**Fix**:
1. Open Xcode → Select target → Signing & Capabilities
2. Add "Push Notifications" capability
3. Add "Background Modes" → Enable "Remote notifications"
4. Rebuild: `npx expo run:ios --device --clean`

---

### Issue 2: Development vs Production Mismatch

**Symptom**: Token works but notifications don't arrive

**Check**:
- Your build is **development** (Debug build)
- Firebase has **Development APNs key** uploaded ✅ (you have this)
- Entitlements file has `aps-environment: development`

**If using production build**:
- Need `aps-environment: production`
- Firebase needs **Production APNs key** ✅ (you have this)

---

### Issue 3: App Needs Rebuild

**After adding entitlements or capabilities**:
```bash
# Clean build
cd ios
rm -rf build
pod install
cd ..
npx expo run:ios --device --clean
```

---

## 🔍 Quick Diagnostic Checklist

Run through this checklist:

- [ ] **APNs token received?** (Check Xcode console for `📱 [APNs] APNs device token received`)
- [ ] **Push Notifications capability added?** (Xcode → Signing & Capabilities)
- [ ] **Background Modes enabled?** (Xcode → Signing & Capabilities → Remote notifications)
- [ ] **Entitlements file exists?** (Check for `Steps.entitlements` in Xcode)
- [ ] **App rebuilt after adding capabilities?** (Run `npx expo run:ios --device --clean`)
- [ ] **Notification permissions granted?** (iOS Settings → Your App → Notifications)
- [ ] **Device connected to internet?**
- [ ] **Testing on physical device?** (Not simulator)

---

## 📱 What to Check in Xcode Console

When you start the app, you should see this sequence:

```
🔥 [Firebase] Starting Firebase initialization...
✅ [Firebase] Firebase initialized successfully
📱 [APNs] APNs device token received          ← CRITICAL: Must see this!
✅ [APNs] APNs token forwarded to Firebase
✅ [FCM] FCM token available: ...
📱 [Token] FCM token received: ...
```

**If you DON'T see** `📱 [APNs] APNs device token received`:
- ❌ Entitlements missing
- ❌ Push Notifications capability not added
- ❌ App needs to be rebuilt

---

## 🚀 Quick Fix Steps

1. **Open Xcode**: `open ios/Steps.xcworkspace`
2. **Select target** (Steps) → **Signing & Capabilities**
3. **Add Push Notifications** capability (if missing)
4. **Add Background Modes** capability (if missing)
   - Enable "Remote notifications"
5. **Rebuild**: `npx expo run:ios --device --clean`
6. **Check Xcode console** for `📱 [APNs] APNs device token received`
7. **Test notification** from Firebase Console

---

## 💡 Pro Tip

The **most common issue** after APNs keys are uploaded is:
- Missing **Push Notifications capability** in Xcode
- Missing **Background Modes → Remote notifications**

These must be added in Xcode, and the app must be rebuilt for them to take effect.

---

## 🆘 Still Not Working?

If notifications still don't work after checking all above:

1. **Check Firebase Console → Cloud Messaging → Reports**
   - Look for specific error messages
   - Check delivery statistics

2. **Verify APNs key matches build type**
   - Development build → Development APNs key ✅
   - Production build → Production APNs key ✅

3. **Check Apple Developer Portal**
   - App ID has Push Notifications enabled
   - Provisioning profile includes push notifications

4. **Try sending via Firebase Admin SDK** (if you have backend access)
   - Sometimes Firebase Console has delays
   - Backend can send with more control







