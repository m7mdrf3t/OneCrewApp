# Firebase Setup Instructions

## Overview
This app now uses Firebase Cloud Messaging (FCM) for push notifications on both iOS and Android. Follow these steps to complete the setup.

## Prerequisites
- Firebase project created
- Access to Firebase Console
- Apple Developer account (for iOS APNs configuration)

## Step 1: Add iOS App to Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the **iOS** icon (or "Add app" → iOS)
4. Enter your iOS bundle ID: `com.minaezzat.onesteps`
5. Download `GoogleService-Info.plist`
6. Replace the placeholder file at `ios/OneCrew/GoogleService-Info.plist.placeholder` with the downloaded file
7. Rename it to `GoogleService-Info.plist`
8. **Important**: Add the file to your Xcode project:
   - Open Xcode
   - Drag `GoogleService-Info.plist` into the project navigator
   - Ensure "Copy items if needed" is checked
   - Ensure it's added to the "OneCrew" target

## Step 2: Configure APNs for iOS

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles** → **Keys**
3. Click the **+** button to create a new key
4. Name it (e.g., "APNs Key")
5. Enable **Apple Push Notifications service (APNs)**
6. Click **Continue** and **Register**
7. Download the `.p8` file (you can only download it once!)
8. Note the **Key ID** and **Team ID**

9. Go back to Firebase Console
10. Navigate to **Project Settings** → **Cloud Messaging** tab
11. Under **Apple app configuration**, click **Upload**
12. Upload the `.p8` file
13. Enter the **Key ID** and **Team ID**
14. Click **Upload**

## Step 3: Add Android App to Firebase

1. In Firebase Console, click the **Android** icon (or "Add app" → Android)
2. Enter your Android package name: `com.minaezzat.onesteps`
3. Download `google-services.json`
4. Replace the placeholder file at `android/android/app/google-services.json.placeholder` with the downloaded file
5. Rename it to `google-services.json`
6. **Important**: The file should be in `android/app/google-services.json` (not `android/android/app/`)
   - If your structure is `android/android/app/`, place it there
   - The build.gradle files are already configured

## Step 4: Install Dependencies

Run the following command to install Firebase packages:

```bash
npm install
```

For iOS, you'll also need to install CocoaPods:

```bash
cd ios
pod install
cd ..
```

## Step 5: Build and Test

### iOS
```bash
npm run ios
# or
npx expo run:ios
```

### Android
```bash
npm run android
# or
npx expo run:android
```

## Step 6: Verify Setup

1. **Check Firebase Initialization**:
   - Look for "✅ Firebase Messaging configured" in console logs
   - Look for "📱 FCM token: ..." when app starts

2. **Test Token Generation**:
   - App should request notification permissions
   - FCM token should be generated and logged
   - Token should be registered with backend

3. **Test Notifications**:
   - Use Firebase Console → Cloud Messaging → Send test message
   - Enter the FCM token from app logs
   - Send notification and verify it's received

## Troubleshooting

### iOS Issues

**"Firebase not configured" error:**
- Ensure `GoogleService-Info.plist` is in the Xcode project
- Ensure it's added to the target
- Clean build folder in Xcode (Cmd+Shift+K)
- Rebuild the app

**"APNs token not registered":**
- Ensure APNs key is uploaded to Firebase Console
- Check that `aps-environment` is set in entitlements (already done)
- Verify bundle ID matches Firebase configuration

**"Permission denied":**
- Check that notification permissions are requested
- Verify entitlements file has `aps-environment`

### Android Issues

**"google-services.json not found":**
- Ensure file is in `android/app/` directory
- Check file name is exactly `google-services.json`
- Verify build.gradle has Google Services plugin applied (already done)

**"FirebaseApp not initialized":**
- Ensure `google-services.json` is correct
- Check that MainApplication.kt initializes Firebase (already done)
- Clean and rebuild: `cd android && ./gradlew clean && cd ..`

**"Permission denied" (Android 13+):**
- App should request POST_NOTIFICATIONS permission automatically
- Check that permission is granted in device settings

### General Issues

**"Token not generated":**
- Ensure app is running on a physical device (not simulator/emulator)
- Check network connectivity
- Verify Firebase project is active

**"Backend registration fails":**
- Check backend endpoint is correct: `/api/users/${userId}/push-token`
- Verify token format (should be long alphanumeric string)
- Check backend logs for errors

## Backend Changes Required

Your backend needs to be updated to send notifications via Firebase Admin SDK instead of Expo API:

### Example (Node.js):

```javascript
const admin = require('firebase-admin');

// Initialize Firebase Admin (use service account)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function sendPushNotification(fcmToken, title, body, data) {
  const message = {
    notification: {
      title: title,
      body: body,
    },
    data: data || {},
    token: fcmToken,
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'default',
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}
```

## Token Format Changes

- **Old (Expo)**: `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`
- **New (FCM)**: Long alphanumeric string (e.g., `dKx...`)

Your backend should accept both formats during migration, or update all existing tokens to FCM format.

## Next Steps

1. Complete Firebase configuration (Steps 1-3)
2. Install dependencies and rebuild
3. Test on physical devices
4. Update backend to use Firebase Admin SDK
5. Monitor token registration and notification delivery

## Support

For Firebase-specific issues, refer to:
- [Firebase Cloud Messaging iOS Setup](https://firebase.google.com/docs/cloud-messaging/ios/client)
- [Firebase Cloud Messaging Android Setup](https://firebase.google.com/docs/cloud-messaging/android/client)
- [React Native Firebase Documentation](https://rnfirebase.io/)

















