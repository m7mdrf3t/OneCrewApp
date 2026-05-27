# iOS Build Fix - CocoaPods Dependency Resolution

## Problem
```
Compatible versions of some pods could not be resolved.
```

This happens when CocoaPods can't resolve compatible versions between Firebase pods and other dependencies.

---

## Solution 1: Clear Cache and Rebuild (Recommended First Step)

### For EAS Build:
```bash
eas build --platform ios --clear-cache
```

Or in EAS dashboard, select **"Clear cache and retry build"**

### For Local Build:
```bash
cd ios
rm -rf Pods Podfile.lock
pod cache clean --all
pod install --repo-update
cd ..
```

---

## Solution 2: Update Podfile (If Solution 1 Doesn't Work)

The Podfile uses autolinking, but we might need to specify Firebase versions explicitly.

**Add to `ios/Podfile`** (after line 19, before `prepare_react_native_project!`):

```ruby
# Firebase version constraint
$FirebaseSDKVersion = '11.0.0'  # Adjust based on React Native Firebase 20.4.0 requirements
```

Or add explicit pod versions in the target block:

```ruby
target 'OneCrew' do
  use_expo_modules!
  
  # ... existing code ...
  
  # Explicitly specify Firebase versions if needed
  # Uncomment if autolinking causes issues:
  # pod 'Firebase/Core', $FirebaseSDKVersion
  # pod 'Firebase/Messaging', $FirebaseSDKVersion
  
  # ... rest of existing code ...
end
```

---

## Solution 3: Check React Native Firebase Version Compatibility

React Native Firebase 20.4.0 might need a specific Firebase iOS SDK version. Check compatibility:

1. **Check React Native Firebase docs** for version 20.4.0
2. **Verify Firebase iOS SDK version** it requires
3. **Update if needed**:

```bash
npm install @react-native-firebase/app@latest @react-native-firebase/messaging@latest
```

Or use a specific compatible version if 20.4.0 has issues.

---

## Solution 4: Update Podfile to Use Static Frameworks (If Dynamic Linking Fails)

If you're using `use_frameworks!`, try static linking:

**In `ios/Podfile`**, change:
```ruby
use_frameworks! :linkage => :static
```

Or remove `use_frameworks!` entirely if not needed.

---

## Solution 5: Check for Conflicting Dependencies

Some pods might conflict. Check for:
- Multiple Firebase versions
- Conflicting Google dependencies
- Expo modules that might conflict

**Check Podfile.lock** (if it exists):
```bash
cd ios
grep -i firebase Podfile.lock
grep -i google Podfile.lock
```

---

## Quick Fix Commands

### For EAS Build:
```bash
# Clear cache and rebuild
eas build --platform ios --clear-cache --profile production
```

### For Local Development:
```bash
# Clean everything
cd ios
rm -rf Pods Podfile.lock ~/Library/Caches/CocoaPods
pod cache clean --all
pod deintegrate
pod install --repo-update
cd ..

# Rebuild
npm run ios
```

---

## Most Likely Solution

Since you're using **EAS Build**, the quickest fix is:

1. **Clear cache in EAS**:
   - Go to EAS dashboard
   - Click on the failed build
   - Select **"Clear cache and retry build"**

OR

2. **Command line**:
   ```bash
   eas build --platform ios --clear-cache
   ```

The cache might have an old `Podfile.lock` that conflicts with the new Firebase dependencies.

---

## If Still Failing

1. **Check build logs** for specific pod version conflicts
2. **Try downgrading React Native Firebase** to a stable version:
   ```bash
   npm install @react-native-firebase/app@^19.0.0 @react-native-firebase/messaging@^19.0.0
   ```
3. **Check Expo SDK 54 compatibility** with React Native Firebase 20.x

---

## Verification

After applying fixes, verify:
```bash
cd ios
pod install
# Should complete without errors
```

Then rebuild:
```bash
eas build --platform ios
```




















