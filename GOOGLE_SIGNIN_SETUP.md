# Google Sign-In Setup Guide

## Overview
This guide explains how to complete the Google Sign-In setup for the OneCrew app.

## Prerequisites
- Access to Google Cloud Console
- iOS and Android app bundle IDs:
  - iOS: `com.steps.diggers`
  - Android: `com.steps.diggers`

## Step 1: Create OAuth Client IDs in Google Cloud Console

### iOS Client ID
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Select **iOS** as the application type
6. Enter the bundle ID: `com.steps.diggers`
7. Click **Create**
8. Copy the Client ID (format: `XXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com`)

### Android Client ID
1. In the same Google Cloud Console project
2. Click **Create Credentials** > **OAuth client ID**
3. Select **Android** as the application type
4. Enter the package name: `com.steps.diggers`
5. Get your app's SHA-1 fingerprint:
   ```bash
   # For debug keystore (default)
   keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
   
   # For release keystore (when ready for production)
   keytool -list -v -keystore <path-to-release-keystore> -alias <key-alias>
   ```
6. Enter the SHA-1 fingerprint in the Google Cloud Console
7. Click **Create**
8. Copy the Client ID

## Step 2: Update GoogleAuthService.ts

Open `src/services/GoogleAuthService.ts` and replace the placeholder Client IDs:

```typescript
// Replace this:
const IOS_CLIENT_ID = 'YOUR_IOS_CLIENT_ID_HERE.apps.googleusercontent.com';

// With your actual iOS Client ID:
const IOS_CLIENT_ID = 'YOUR_ACTUAL_IOS_CLIENT_ID.apps.googleusercontent.com';

// Replace this:
const ANDROID_CLIENT_ID = 'YOUR_ANDROID_CLIENT_ID_HERE.apps.googleusercontent.com';

// With your actual Android Client ID:
const ANDROID_CLIENT_ID = 'YOUR_ACTUAL_ANDROID_CLIENT_ID.apps.googleusercontent.com';
```

**Note:** The Web Client ID (`309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj.apps.googleusercontent.com`) is already configured and should not be changed.

## Step 3: Install iOS Dependencies

After updating the Client IDs, run:

```bash
cd ios
pod install
cd ..
```

## Step 4: Rebuild the App (REQUIRED)

**IMPORTANT:** `@react-native-google-signin/google-signin` is a native module and requires a full rebuild of the app. You cannot use Expo Go - you must use a development build.

### Why rebuild is needed
The Google Sign-In package includes native code that must be compiled into your app. This is why you see the error:
```
'RNGoogleSignin' could not be found. Verify that a module by this name is registered in the native binary.
```

### Rebuild Steps

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

## Step 5: Test Google Sign-In

1. Run the app on a physical device or emulator
2. Navigate to Login or Signup page
3. Tap "Sign in with Google" or "Sign up with Google"
4. Complete the Google authentication flow
5. For new users, select category and primary role when prompted

## Troubleshooting

### iOS Issues
- **"Google Sign-In not configured"**: Make sure you've updated the iOS Client ID in `GoogleAuthService.ts`
- **"URL scheme not found"**: The library should handle this automatically, but ensure `Info.plist` has the correct bundle identifier

### Android Issues
- **"Google Play Services not available"**: Ensure Google Play Services is installed on the device/emulator
- **"SHA-1 fingerprint mismatch"**: Verify the SHA-1 in Google Cloud Console matches your keystore
- **"OAuth client ID not found"**: Double-check the Android Client ID in `GoogleAuthService.ts`

### General Issues
- **"'RNGoogleSignin' could not be found"**: This means the native module isn't registered. **You must rebuild the app** using `npx expo run:ios` or `npx expo run:android`. You cannot use Expo Go with native modules.
- **"Category required" error**: This is expected for new users - the app will show a category selection modal
- **Network errors**: Ensure the backend URL is correct and accessible
- **App crashes on Google Sign-In button tap**: Make sure you've rebuilt the app after installing the package

## Backend Integration

The app sends Google ID tokens to:
- **Endpoint**: `POST /api/auth/google`
- **Base URL**: `https://onecrew-backend-309236356616.us-central1.run.app`

The backend will:
- Verify the ID token
- Create a new user account if needed (with category and primary_role)
- Return a JWT token for subsequent API calls

## Additional Notes

- The Web Client ID is used by the backend to verify tokens - do not change it
- iOS and Android Client IDs are used by the mobile app to authenticate with Google
- All three Client IDs must be from the same Google Cloud Console project

