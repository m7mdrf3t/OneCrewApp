# Firebase Native Module Linking Fix

## Issue
The `@react-native-firebase/messaging` module is returning `null`/`undefined` when required, indicating the native module is not properly linked.

## Root Cause
In Expo projects using `expo run:ios`, native modules need to be properly linked through:
1. CocoaPods installation
2. Proper app rebuild
3. Native module configuration

## Solution Steps

### Step 1: Clean and Reinstall Pods

```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

### Step 2: Clean Build Folders

```bash
# Clean iOS build
cd ios
xcodebuild clean -workspace OneCrew.xcworkspace -scheme OneCrew
cd ..

# Remove build folders
rm -rf ios/build
rm -rf ios/Pods/build
```

### Step 3: Rebuild the App

```bash
# Rebuild with clean cache
npx expo run:ios --device --clean
```

**OR** if that doesn't work:

```bash
# Full clean rebuild
rm -rf node_modules
npm install
cd ios
pod install
cd ..
npx expo run:ios --device
```

### Step 4: Verify Pod Installation

Check that Firebase pods are installed:

```bash
cd ios
pod list | grep Firebase
```

You should see:
- `Firebase/Core`
- `Firebase/Messaging`
- `FirebaseCore`
- `FirebaseMessaging`

### Step 5: Check Xcode Project

1. Open `ios/OneCrew.xcworkspace` in Xcode
2. Check that `Firebase` frameworks are linked:
   - Select project in navigator
   - Go to "Build Phases" → "Link Binary With Libraries"
   - Verify `FirebaseCore.framework` and `FirebaseMessaging.framework` are present

3. Check Podfile includes Firebase:
   ```ruby
   # Should have Firebase pods
   pod 'Firebase/Core'
   pod 'Firebase/Messaging'
   ```

### Step 6: Verify GoogleService-Info.plist

1. Open Xcode project
2. Check that `GoogleService-Info.plist` is:
   - Added to the project (visible in Xcode navigator)
   - Added to the target (check "Target Membership" in File Inspector)
   - In the correct location: `ios/OneCrew/GoogleService-Info.plist`

### Step 7: Check AppDelegate

Verify `AppDelegate.swift` has:
- `import FirebaseCore`
- `import FirebaseMessaging`
- `FirebaseApp.configure()` called in `didFinishLaunchingWithOptions`

---

## Alternative: Use Expo Config Plugin (If Above Doesn't Work)

If the above steps don't work, you may need to add an Expo config plugin. However, since you're using `expo run:ios` (dev client), native modules should work without a plugin.

If needed, install the plugin:

```bash
npm install @react-native-firebase/app
```

Then add to `app.json`:

```json
{
  "expo": {
    "plugins": [
      "@react-native-firebase/app"
    ]
  }
}
```

Then rebuild:
```bash
npx expo prebuild --clean
npx expo run:ios --device
```

---

## Debugging Steps

### 1. Check NativeModules

After the app starts, check the console logs. The new diagnostic logging will show:
- `NativeModules keys: X` - Should show available native modules
- If this is 0 or very low, native modules aren't loading

### 2. Check Podfile

Open `ios/Podfile` and verify it includes:

```ruby
platform :ios, '13.0'
use_frameworks! :linkage => :static

target 'OneCrew' do
  # ... other pods
  pod 'Firebase/Core'
  pod 'Firebase/Messaging'
end
```

### 3. Check Build Settings

In Xcode:
1. Select project → Build Settings
2. Search for "Other Linker Flags"
3. Should include `-ObjC` flag

### 4. Check for Duplicate Symbols

If you see linker errors about duplicate symbols, you may have Firebase included twice:
- Once via CocoaPods
- Once manually

Remove any manual Firebase imports.

---

## Expected Behavior After Fix

Once fixed, you should see in console logs:

```
📦 [Firebase] Checking NativeModules availability...
📦 [Firebase] NativeModules keys: [many modules]
📦 [Firebase] Requiring @react-native-firebase/messaging...
📦 [Firebase] Require result: { isNull: false, isUndefined: false, type: 'object', hasDefault: true, keys: [...] }
✅ [Firebase] Successfully loaded Firebase messaging module
📦 [Firebase] Module type: object
📦 [Firebase] Has default export: true
```

---

## Common Issues

### Issue: "No such module 'FirebaseCore'"
**Solution**: Pods not installed. Run `cd ios && pod install`

### Issue: "Undefined symbols for architecture"
**Solution**: Clean build and reinstall pods

### Issue: Module still null after rebuild
**Solution**: 
1. Check Podfile has Firebase pods
2. Verify GoogleService-Info.plist is in target
3. Try `npx expo prebuild --clean` then rebuild

### Issue: Build fails with Firebase errors
**Solution**: 
1. Check iOS deployment target (should be 13.0+)
2. Verify CocoaPods version: `pod --version` (should be 1.11+)
3. Update CocoaPods: `sudo gem install cocoapods`

---

## Quick Fix Command Sequence

Run these commands in order:

```bash
# 1. Clean everything
rm -rf node_modules ios/Pods ios/Podfile.lock ios/build

# 2. Reinstall dependencies
npm install

# 3. Reinstall pods
cd ios
pod install
cd ..

# 4. Rebuild app
npx expo run:ios --device --clean
```

---

## Verification

After rebuilding, check the console logs. You should see:
- ✅ `[Firebase] Successfully loaded Firebase messaging module`
- ✅ `[Firebase] Messaging instance created successfully`
- ✅ `[FCM] FCM token available`

If you still see `⚠️ [Firebase] Messaging module is null or undefined`, the native module is still not linked properly. Check the Podfile and Xcode project configuration.

---

## Need More Help?

If the issue persists:
1. Check Xcode build logs for errors
2. Verify all Firebase dependencies are installed
3. Check that you're using a physical device (not simulator)
4. Ensure you're using `expo run:ios` (not `expo start`)



