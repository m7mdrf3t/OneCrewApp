# Apple Sign-In Configuration Fix

## Issue
Apple Sign-In was failing with error codes:
- `AKAuthenticationError Code=-7026`
- `AuthenticationServices.AuthorizationError Code=1000`
- `ERR_REQUEST_UNKNOWN`

These errors indicate that Sign in with Apple capability was not properly configured.

## ✅ Fixes Applied

### 1. Updated `ios/Steps/Steps.entitlements`
Added the Sign in with Apple capability:
```xml
<key>com.apple.developer.applesignin</key>
<array>
  <string>Default</string>
</array>
```

### 2. Updated `app.json`
Added `usesAppleSignIn: true` to the iOS configuration:
```json
"ios": {
  "usesAppleSignIn": true,
  ...
}
```

## ⚠️ Required: Apple Developer Console Configuration

The app will still fail until the Bundle ID is properly configured in Apple Developer Console. You need to:

### Step 1: Configure App ID in Apple Developer Console

1. **Go to Apple Developer Console**
   - Navigate to [developer.apple.com/account](https://developer.apple.com/account)
   - Go to **Certificates, Identifiers & Profiles** → **Identifiers**

2. **Find or Create App ID**
   - Search for: `com.minaezzat.onesteps`
   - If it doesn't exist, create a new App ID with this Bundle ID

3. **Enable Sign in with Apple**
   - Click on the App ID
   - Check the **Sign in with Apple** capability
   - Click **Save**

### Step 2: Configure Services ID (for Supabase OAuth)

1. **Create Services ID**
   - In Apple Developer Console → **Identifiers** → Click **+** → Select **Services IDs**
   - Create a new Services ID (e.g., `com.minaezzat.onesteps.web`)
   - Configure it:
     - **Domains**: `uwdzkrferlogqasrxcve.supabase.co`
     - **Return URLs**: `https://uwdzkrferlogqasrxcve.supabase.co/auth/v1/callback`

2. **Configure in Supabase Dashboard**
   - Go to Supabase Dashboard → **Authentication** → **Providers** → **Apple**
   - Add the Services ID as the Client ID
   - Generate and add the client secret (using Apple Secret Generator)

### Step 3: Rebuild the App

After making these changes, you **must rebuild** the app:

```bash
# Clean build
npx expo run:ios --device --clean
```

**Important**: 
- The app must be rebuilt (not just restarted) for entitlements changes to take effect
- Test on a **physical iOS device** (Apple Sign-In doesn't work in simulator)
- Make sure you're signed in with the correct Apple Developer account in Xcode

## Verification Checklist

- [ ] App ID `com.minaezzat.onesteps` has "Sign in with Apple" enabled in Apple Developer Console
- [ ] Services ID created and configured for Supabase
- [ ] Supabase Dashboard has Apple OAuth configured with Services ID and secret
- [ ] App rebuilt with `npx expo run:ios --device --clean`
- [ ] Testing on physical iOS device (not simulator)
- [ ] Signed in with correct Apple Developer account in Xcode

## Testing

After completing the above steps:

1. **Test on Physical Device**
   - Apple Sign-In only works on physical devices, not simulators
   - Make sure you're testing on iOS 13+ device

2. **Check Console Logs**
   - Should see: `✅ Apple identity token received, exchanging with Supabase...`
   - Should NOT see: `ERR_REQUEST_UNKNOWN` or `AKAuthenticationError Code=-7026`

3. **Verify Flow**
   - Tap "Sign in with Apple" button
   - Apple Sign-In sheet should appear
   - After authentication, should successfully exchange token with Supabase
   - Should receive backend JWT token

## Troubleshooting

### Still Getting Error -7026 or 1000?

1. **Verify Entitlements in Xcode**
   - Open `ios/Steps.xcworkspace` in Xcode
   - Select **Steps** target → **Signing & Capabilities**
   - Verify "Sign in with Apple" capability is listed
   - If not, click **+ Capability** → **Sign in with Apple**

2. **Check Bundle ID Match**
   - Verify Xcode project Bundle ID matches: `com.minaezzat.onesteps`
   - Verify it matches the App ID in Apple Developer Console

3. **Verify Provisioning Profile**
   - Make sure the provisioning profile includes the Sign in with Apple capability
   - You may need to regenerate the provisioning profile after enabling the capability

4. **Check Apple Developer Account**
   - Make sure you're signed in with the correct Apple Developer account in Xcode
   - The account must have access to the App ID

### Error: "Sign in with Apple is not available"

- Make sure you're testing on iOS 13+ device
- Make sure you're testing on a physical device (not simulator)
- Verify the device has an Apple ID signed in

## Related Files

- `ios/Steps/Steps.entitlements` - Updated with Sign in with Apple capability
- `app.json` - Updated with `usesAppleSignIn: true`
- `src/services/AppleAuthService.ts` - Apple authentication service (no changes needed)
- `src/contexts/ApiContext.tsx` - Updated to use new API client method

---

**Last Updated**: 2025-01-20  
**Status**: Configuration files updated, awaiting Apple Developer Console setup



