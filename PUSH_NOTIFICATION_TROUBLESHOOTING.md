# Push Notification Troubleshooting Guide

## ✅ Current Status
- **FCM Token**: ✅ Retrieved successfully
- **Token**: `fkAjPF4zYkmahmUFoIta9o:APA91bFgiGV1SRJrmSxxupSU3kjuDjM_rLY1aQ8SxYZH3U4mUqJQs9-99zm3XNYHGn5GSbCCTh2j6_8IlnspKIse_-pkNdulZS5uWkLb-r97N3GbpkQ1oxc`
- **Permissions**: ✅ Granted
- **Firebase**: ✅ Initialized
- **Notifications from Firebase Console**: ❌ Not working

---

## 🔍 Common Issues & Solutions

### Issue 1: APNs Key Not Uploaded to Firebase ⚠️ **MOST COMMON**

**Symptom**: FCM token is generated, but notifications from Firebase Console don't arrive.

**Solution**: Upload APNs Authentication Key to Firebase Console

#### Step 1: Get APNs Key from Apple Developer Portal

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Keys** in the left sidebar
4. Click the **+** button to create a new key
5. Enter a name (e.g., "OneCrew APNs Key")
6. Check **Apple Push Notifications service (APNs)**
7. Click **Continue** → **Register**
8. **Download the `.p8` file** (you can only download it once!)
9. **Note the Key ID** (shown on the page)
10. **Note your Team ID** (shown at top right of Apple Developer Portal)

#### Step 2: Upload to Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the **⚙️ Settings** icon → **Project settings**
4. Go to the **Cloud Messaging** tab
5. Scroll to **Apple app configuration** section
6. Under **APNs Authentication Key**:
   - Click **Upload**
   - Select your `.p8` file
   - Enter the **Key ID** (from Step 1)
   - Enter your **Team ID** (from Step 1)
7. Click **Upload**

#### Step 3: Verify

- Check that the APNs key shows as uploaded in Firebase Console
- The status should show as active/configured

---

### Issue 2: Missing iOS Entitlements

**Symptom**: App doesn't register for remote notifications, or APNs token is not received.

**Check**: Verify entitlements file exists and is configured

#### Solution: Add/Verify Entitlements

1. **Open Xcode**
2. **Open your project**: `ios/Steps.xcworkspace`
3. **Select your target** (Steps)
4. Go to **Signing & Capabilities** tab
5. Check if **Push Notifications** capability is added
   - If not, click **+ Capability** → **Push Notifications**
6. Check if **Background Modes** capability is added
   - If not, click **+ Capability** → **Background Modes**
   - Enable **Remote notifications**

#### Alternative: Check Entitlements File

1. In Xcode, look for `Steps.entitlements` file
2. It should contain:
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
3. For **production builds**, change `development` to `production`

---

### Issue 3: APNs Token Not Received

**Symptom**: Check Xcode console logs for APNs token registration.

**What to Look For**:
```
📱 [APNs] APNs device token received
✅ [APNs] APNs token forwarded to Firebase
✅ [FCM] FCM token available: ...
```

**If you see**:
```
❌ [APNs] Failed to register for remote notifications: ...
```

**Possible Causes**:
1. Missing entitlements (see Issue 2)
2. App not signed with proper provisioning profile
3. Device not connected to internet
4. App running on simulator (APNs doesn't work on simulator)

**Solution**:
- Ensure app is running on **physical device**
- Check Xcode console for APNs errors
- Verify entitlements are configured
- Rebuild the app: `npx expo run:ios --device`

---

### Issue 4: Development vs Production APNs Mismatch

**Symptom**: Token works but notifications don't arrive.

**Check**:
- Firebase Console → Cloud Messaging → Check APNs configuration
- Xcode → Signing & Capabilities → Check `aps-environment` value
- **Development builds** need `development` APNs key
- **Production builds** need `production` APNs key

**Solution**:
- For **development/testing**: Use `development` APNs key in Firebase
- For **App Store builds**: Use `production` APNs key in Firebase
- Update entitlements file accordingly

---

### Issue 5: Notification Payload Format

**Symptom**: Notification sent but not displayed.

**Check**: Firebase Console notification format

**Correct Format for iOS**:
```json
{
  "notification": {
    "title": "Test Notification",
    "body": "This is a test message"
  },
  "apns": {
    "payload": {
      "aps": {
        "sound": "default",
        "badge": 1,
        "alert": {
          "title": "Test Notification",
          "body": "This is a test message"
        }
      }
    }
  },
  "token": "YOUR_FCM_TOKEN"
}
```

**When sending from Firebase Console**:
- Use the **"Send test message"** feature
- Select **"Single device"**
- Paste your FCM token
- Enter title and body
- Click **Test**

---

## 🔍 Debugging Steps

### Step 1: Check Xcode Console Logs

Look for these logs when app starts:

**✅ Success Indicators**:
```
🔥 [Firebase] Starting Firebase initialization...
✅ [Firebase] Firebase initialized successfully
📱 [APNs] APNs device token received
✅ [APNs] APNs token forwarded to Firebase
✅ [FCM] FCM token available: ...
```

**❌ Error Indicators**:
```
❌ [Firebase] Firebase configured but app instance is nil
❌ [APNs] Failed to register for remote notifications: ...
⚠️ [FCM] Could not get FCM token: ...
```

### Step 2: Check Firebase Console

1. Go to Firebase Console → **Cloud Messaging**
2. Click **Reports** tab
3. Check for delivery failures
4. Look for error messages related to your token

### Step 3: Verify Token Format

**✅ Correct FCM Token**:
- Long string (140+ characters)
- Contains colons and dashes
- Example: `fkAjPF4zYkmahmUFoIta9o:APA91bF...`

**❌ Wrong Token (Expo)**:
- Starts with `ExponentPushToken[`
- Example: `ExponentPushToken[BB91AjI1X7R3qvaLjfVsA_]`

### Step 4: Test Notification Delivery

1. **Send from Firebase Console**:
   - Go to Cloud Messaging → Send test message
   - Use your FCM token
   - Check if notification arrives

2. **Check Delivery Status**:
   - Firebase Console → Cloud Messaging → Reports
   - Look for delivery statistics
   - Check for errors

3. **Check Device**:
   - Ensure device is connected to internet
   - Check iOS Settings → Your App → Notifications (should be enabled)
   - Ensure device is not in Do Not Disturb mode

---

## ✅ Quick Checklist

Before testing, verify:

- [ ] **APNs key uploaded to Firebase Console**
  - Firebase Console → Project Settings → Cloud Messaging
  - Check "Apple app configuration" section
  - APNs Authentication Key should be uploaded

- [ ] **Entitlements configured**
  - Xcode → Signing & Capabilities
  - Push Notifications capability added
  - Background Modes → Remote notifications enabled

- [ ] **App running on physical device** (not simulator)

- [ ] **FCM token is valid** (not Expo token)

- [ ] **Notification permissions granted**
  - iOS Settings → Your App → Notifications → Enabled

- [ ] **Device connected to internet**

- [ ] **Firebase initialized correctly**
  - Check Xcode console for Firebase logs

- [ ] **APNs token received**
  - Check Xcode console for: `📱 [APNs] APNs device token received`

---

## 🎯 Most Likely Issue

Based on your symptoms (FCM token works but notifications don't arrive), the **most common issue is**:

### ⚠️ **APNs Key Not Uploaded to Firebase**

**This is required for iOS push notifications to work!**

Firebase needs the APNs authentication key to send notifications to iOS devices. Without it, Firebase can generate FCM tokens, but cannot actually deliver notifications.

**Quick Fix**:
1. Get APNs key from Apple Developer Portal
2. Upload to Firebase Console → Project Settings → Cloud Messaging
3. Test again

---

## 📝 Next Steps

1. **Upload APNs key to Firebase** (if not done)
2. **Verify entitlements** in Xcode
3. **Rebuild app** if entitlements changed: `npx expo run:ios --device`
4. **Test notification** from Firebase Console
5. **Check Xcode console** for any errors
6. **Check Firebase Console → Reports** for delivery status

---

## 🔗 Related Files

- `ios/Steps/AppDelegate.swift` - iOS native notification handling
- `src/services/PushNotificationService.ts` - Push notification service
- `App.tsx` - Notification listeners
- Firebase Console → Cloud Messaging → APNs configuration

---

## 💡 Pro Tips

1. **Always test on physical device** - Simulators don't support push notifications
2. **Check Firebase Console Reports** - Shows delivery statistics and errors
3. **Use Firebase Console "Send test message"** - Easiest way to test
4. **Monitor Xcode console** - Shows detailed logs for debugging
5. **Check iOS Settings** - Ensure notifications are enabled for your app

---

## 🆘 Still Not Working?

If notifications still don't work after checking all above:

1. **Check Firebase Console → Cloud Messaging → Reports**
   - Look for specific error messages
   - Check delivery statistics

2. **Verify APNs key is correct**
   - Re-download from Apple Developer Portal if needed
   - Ensure Key ID and Team ID are correct in Firebase

3. **Check app build configuration**
   - Development vs Production APNs mismatch
   - Entitlements file `aps-environment` value

4. **Rebuild app completely**
   ```bash
   cd ios
   pod install
   cd ..
   npx expo run:ios --device --clean
   ```

5. **Check Apple Developer Portal**
   - Ensure App ID has Push Notifications enabled
   - Verify provisioning profile includes push notifications




