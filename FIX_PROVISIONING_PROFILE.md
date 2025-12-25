# Fix Provisioning Profile for Sign in with Apple

## Problem
The build is failing because the provisioning profile doesn't include the Sign in with Apple capability:
```
error: Provisioning profile "iOS Team Provisioning Profile: com.minaezzat.onesteps" doesn't support the Sign in with Apple capability.
error: Provisioning profile "iOS Team Provisioning Profile: com.minaezzat.onesteps" doesn't include the com.apple.developer.applesignin entitlement.
```

## Solution 1: Enable Sign in with Apple in Apple Developer Console (Recommended)

### Step 1: Enable Capability in Apple Developer Console

1. **Go to Apple Developer Console**
   - Navigate to [developer.apple.com/account](https://developer.apple.com/account)
   - Sign in with your Apple Developer account
   - Go to **Certificates, Identifiers & Profiles**

2. **Configure App ID**
   - Click on **Identifiers** in the left sidebar
   - Find and click on your App ID: `com.minaezzat.onesteps`
   - If it doesn't exist, create a new App ID:
     - Click the **+** button
     - Select **App IDs** → **Continue**
     - Select **App**
     - Enter Description: `Steps App`
     - Enter Bundle ID: `com.minaezzat.onesteps`
     - Click **Continue** → **Register**

3. **Enable Sign in with Apple**
   - In the App ID details page, scroll to **Capabilities**
   - Check the box for **Sign in with Apple**
   - Click **Save**
   - You may see a warning about needing to configure it - that's okay for now

### Step 2: Regenerate Provisioning Profile in Xcode

1. **Open Xcode**
   ```bash
   open ios/Steps.xcworkspace
   ```

2. **Select the Project**
   - Click on **Steps** project in the left sidebar
   - Select the **Steps** target
   - Go to **Signing & Capabilities** tab

3. **Fix Signing**
   - Make sure **Automatically manage signing** is checked
   - Select your **Team**: `9MK2V33M87` (or your team name)
   - Xcode should automatically regenerate the provisioning profile

4. **Verify Capabilities**
   - In the **Signing & Capabilities** tab, you should see **Sign in with Apple** listed
   - If not, click **+ Capability** → **Sign in with Apple**

5. **Clean and Rebuild**
   ```bash
   # Clean build folder
   cd ios
   xcodebuild clean -workspace Steps.xcworkspace -scheme Steps
   
   # Or use Expo
   cd ..
   npx expo run:ios --device --clean
   ```

### Step 3: Alternative - Manual Profile Download

If automatic signing doesn't work:

1. **Download New Profile**
   - In Apple Developer Console → **Profiles**
   - Find your Development/Distribution profile for `com.minaezzat.onesteps`
   - If it doesn't have Sign in with Apple, delete it and create a new one
   - Download the new profile

2. **Install Profile**
   - Double-click the downloaded `.mobileprovision` file
   - Or drag it into Xcode

3. **Select Profile in Xcode**
   - In Xcode → **Signing & Capabilities**
   - Uncheck **Automatically manage signing** temporarily
   - Select the new provisioning profile from the dropdown
   - Re-check **Automatically manage signing**

## Solution 2: Temporarily Disable Sign in with Apple (Quick Fix)

If you don't need Sign in with Apple right now, you can temporarily disable it:

### Step 1: Remove from app.json
```json
"ios": {
  "bundleIdentifier": "com.minaezzat.onesteps",
  // Remove or comment out this line:
  // "usesAppleSignIn": true,
}
```

### Step 2: Remove from Entitlements
Edit `ios/Steps/Steps.entitlements` and remove:
```xml
<key>com.apple.developer.applesignin</key>
<array>
  <string>Default</string>
</array>
```

### Step 3: Remove from Xcode
1. Open `ios/Steps.xcworkspace` in Xcode
2. Select **Steps** target → **Signing & Capabilities**
3. Click the **X** on **Sign in with Apple** capability to remove it

### Step 4: Rebuild
```bash
npx expo run:ios --device --clean
```

## Verification

After applying Solution 1, verify:

1. **Check Xcode**
   - Open `ios/Steps.xcworkspace`
   - Select **Steps** target → **Signing & Capabilities**
   - Verify **Sign in with Apple** is listed
   - Verify no signing errors

2. **Check Build**
   - Try building: `npx expo run:ios --device`
   - Should not see provisioning profile errors

3. **Check Apple Developer Console**
   - Go to **Identifiers** → `com.minaezzat.onesteps`
   - Verify **Sign in with Apple** is checked

## Troubleshooting

### Still Getting Errors?

1. **Clear Derived Data**
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```

2. **Clean Pods**
   ```bash
   cd ios
   pod deintegrate
   pod install
   cd ..
   ```

3. **Verify Team ID**
   - Make sure `DEVELOPMENT_TEAM = 9MK2V33M87` matches your Apple Developer account
   - Check in Xcode → **Signing & Capabilities** → **Team**

4. **Check Bundle ID**
   - Verify Bundle ID is exactly: `com.minaezzat.onesteps`
   - Must match App ID in Apple Developer Console

5. **Wait for Propagation**
   - Sometimes it takes a few minutes for changes in Apple Developer Console to propagate
   - Wait 5-10 minutes and try again

## Notes

- **Development vs Distribution**: Make sure you're using the correct profile type (Development for local builds, Distribution for App Store)
- **Team Account**: You must be signed in with an Apple Developer account that has access to the App ID
- **Automatic Signing**: Xcode's automatic signing should handle this, but manual profiles may need regeneration

---

**Recommended**: Use Solution 1 if you plan to use Sign in with Apple. Use Solution 2 only as a temporary workaround.


