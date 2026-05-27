# Google Sign-In iOS URL Scheme Fix

## Issue
Google Sign-In failing on iOS with error:
```
Your app is missing support for the following URL schemes: 
com.googleusercontent.apps.309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj
```

## Root Cause
The iOS app's `Info.plist` was missing the Google Sign-In URL scheme. This URL scheme is required for Google Sign-In SDK to redirect back to the app after authentication.

## Fix Applied ✅

### Updated `ios/Steps/Info.plist`

Added the Google Sign-In URL scheme to `CFBundleURLTypes`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.minaezzat.onesteps</string>
    </array>
  </dict>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>exp+one-crew</string>
    </array>
  </dict>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.googleusercontent.apps.309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj</string>
    </array>
  </dict>
</array>
```

### URL Scheme Format
The URL scheme is the **reversed Client ID**:
- **Client ID**: `309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj.apps.googleusercontent.com`
- **URL Scheme**: `com.googleusercontent.apps.309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj`

## How It Works

1. User taps "Sign in with Google" in the app
2. Google Sign-In SDK opens Google authentication
3. User completes authentication
4. Google redirects back to the app using the URL scheme: `com.googleusercontent.apps.309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj://`
5. iOS recognizes this URL scheme and opens the app
6. Google Sign-In SDK receives the authentication result

## Next Steps

### 1. Rebuild the App ⚠️ REQUIRED

After adding the URL scheme, you **must rebuild** the iOS app:

```bash
# Clean rebuild for iOS
npx expo run:ios --device --clean

# Or if using EAS build
eas build --platform ios --profile production
```

**Important**: The URL scheme is only registered when the app is built. Simply restarting the app won't work.

### 2. Test Google Sign-In

After rebuilding:
1. Open the app
2. Go to Sign In screen
3. Tap "Sign in with Google"
4. Complete Google authentication
5. Verify you're redirected back to the app successfully

## Verification

To verify the URL scheme is registered:

1. **Check Info.plist** (already done ✅):
   ```bash
   grep -A 5 "CFBundleURLTypes" ios/Steps/Info.plist
   ```

2. **After rebuild, test URL scheme**:
   - Open Safari on iOS device
   - Type: `com.googleusercontent.apps.309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj://test`
   - If the app opens, the URL scheme is registered correctly

## Related Configuration

### Google Cloud Console
- **Client ID**: `309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj.apps.googleusercontent.com`
- **Bundle ID**: `com.minaezzat.onesteps`
- **URL Scheme**: `com.googleusercontent.apps.309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj`

### GoogleAuthService.ts
- **Web Client ID**: `309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj.apps.googleusercontent.com`
- **iOS Client ID**: `309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj.apps.googleusercontent.com`

## Status

✅ **FIXED** - URL scheme added to Info.plist
⚠️ **REBUILD REQUIRED** - App must be rebuilt for changes to take effect
