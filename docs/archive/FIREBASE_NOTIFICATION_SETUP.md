# Firebase Push Notifications - Setup Guide

## Quick Fix for "No Firebase App '[DEFAULT]' has been created"

The app now includes a Firebase initialization service that:
1. Uses native config files (GoogleService-Info.plist, google-services.json) when available
2. Falls back to explicit initialization from app.json when native config is missing
3. Ensures Firebase is initialized before any messaging/notification code runs

## Required Setup (Choose One)

### Option A: Native Config Files (Recommended)

**iOS:**
1. Go to [Firebase Console](https://console.firebase.google.com/) → Your Project → Project Settings
2. Add iOS app with bundle ID: `com.minaezzat.onesteps`
3. Download `GoogleService-Info.plist`
4. Place in `ios/Steps/` directory
5. Add to Xcode project: Drag file into Steps target in Xcode navigator
6. Rebuild: `npx expo run:ios`

**Android:**
1. Firebase Console → Add Android app with package: `com.minaezzat.onesteps`
2. Download `google-services.json`
3. Place in `android/app/google-services.json`
4. Rebuild: `npx expo run:android`

### Option B: App.json Config (When native files aren't available)

Add your Firebase config to `app.json`:

```json
"extra": {
  "firebaseConfig": {
    "apiKey": "YOUR_API_KEY",
    "authDomain": "YOUR_PROJECT.firebaseapp.com",
    "projectId": "YOUR_PROJECT_ID",
    "storageBucket": "YOUR_PROJECT.appspot.com",
    "messagingSenderId": "YOUR_SENDER_ID",
    "appId": "YOUR_APP_ID"
  }
}
```

Get these values from Firebase Console → Project Settings → Your apps → SDK setup and configuration.

### Option C: Environment Variables (EAS Build)

For EAS Build, add to your `.env` or EAS secrets:
```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
```

## Verify Setup

1. **Run the app** and check console logs:
   - `✅ [Firebase] Already initialized (native config)` - Native files working
   - `✅ [Firebase] Initialized from app config` - App.json/env config working
   - `⚠️ [Firebase] Not initialized` - Need to complete setup above

2. **Test push notifications:**
   - Login to the app on a physical device
   - Get FCM token from logs
   - Send test notification from Firebase Console → Cloud Messaging
   - Or send a chat message (backend webhook triggers push)

## APNs (iOS Only)

For iOS push to work, you must:
1. Upload APNs Authentication Key (.p8) to Firebase Console
2. Firebase Console → Project Settings → Cloud Messaging → Apple app configuration
3. See FIREBASE_SETUP_INSTRUCTIONS.md for detailed APNs setup

## Troubleshooting

**"No Firebase App '[DEFAULT]' has been created"**
- Complete Option A or B above
- Ensure config has apiKey, projectId, and appId (all required for Option B)
- Rebuild the app after adding config files

**Push not received on iOS**
- Check APNs key is uploaded to Firebase
- Use physical device (simulator has limited push support)
- Verify bundle ID matches Firebase config

**Push not received on Android**
- Ensure google-services.json is in android/app/
- Check that google-services plugin is applied in build.gradle
- Rebuild: `cd android && ./gradlew clean && cd ..`
