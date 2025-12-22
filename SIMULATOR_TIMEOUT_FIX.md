# iOS Simulator Timeout Fix

## Error
```
Error: xcrun simctl openurl ... exited with non-zero code: 60
Operation timed out
```

## What Happened
The app **installed successfully** on the simulator, but opening the Expo development client URL timed out. This is a common issue and doesn't mean the app is broken.

## Quick Fixes

### Option 1: Open App Manually (Easiest)
1. Look at the iOS Simulator window
2. Find the "Steps" app icon
3. Tap it to open the app
4. The app should connect to Metro bundler automatically

### Option 2: Restart Metro Bundler
```bash
# Stop current Metro bundler (Ctrl+C)
# Then restart:
npx expo start --ios
```

### Option 3: Fresh Simulator Boot
```bash
# Shutdown all simulators
xcrun simctl shutdown all

# Boot the simulator
xcrun simctl boot "iPhone 16e"

# Run the app
npx expo run:ios
```

### Option 4: Use Expo Go Instead
If the development client is having issues:
```bash
npx expo start
# Then scan QR code with Expo Go app
```

## Why This Happens
- Simulator is slow/unresponsive
- Network timeout between simulator and Metro bundler
- Development client URL handler timing out
- Simulator needs a fresh boot

## Verification
The app **is installed** (you saw "Installing on iPhone 16e" succeed). The timeout is just in opening the URL. The app itself should work fine if you open it manually.

## Next Steps
1. Try opening the app manually in simulator
2. If that works, you're good to go!
3. If not, try Option 3 (fresh boot)

The console errors we fixed earlier are still resolved - this is just a simulator URL opening issue.

