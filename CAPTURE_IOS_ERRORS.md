# How to Capture iOS Console Errors

To help fix the errors, please capture the actual error messages from the iOS console.

## Method 1: Metro Bundler Console (Easiest)
1. Look at the terminal where you ran `npx expo start` or `npx expo run:ios`
2. Scroll up to see all error messages
3. Copy all red error messages and warnings

## Method 2: React Native Logs
```bash
npx react-native log-ios
```
This will show real-time iOS console logs with errors.

## Method 3: Xcode Console
1. Open Xcode
2. Open `ios/Steps.xcworkspace` (not .xcodeproj)
3. Run the app from Xcode (⌘R)
4. Check the console output at the bottom
5. Look for red error messages

## Method 4: iOS Simulator Console
1. Open iOS Simulator
2. Go to **Device > Console** (or press ⌘/)
3. Filter by your app name or "Error"
4. Copy the error messages

## Method 5: Save Logs to File
```bash
# Capture all iOS logs to a file
npx react-native log-ios > ios_errors.log 2>&1

# Then share the ios_errors.log file
```

## What to Look For
- Red error messages
- Yellow warnings
- Messages containing:
  - "Error"
  - "Failed"
  - "Cannot"
  - "undefined"
  - "null"
  - "TypeError"
  - "ReferenceError"
  - Component names (like "BVLinearGradient")

## Common Error Patterns
1. **Native Module Errors**: "View config not found", "Native module not found"
2. **Import Errors**: "Cannot find module", "Unable to resolve module"
3. **Type Errors**: "Cannot read property", "is not a function"
4. **Style Errors**: "Style property not found", "Invalid style"

Please share the error messages so I can fix them!

