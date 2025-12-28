# Building on Specific Devices

## iOS - Physical Device

### Option 1: Using Expo CLI (Recommended)
```bash
# List all available iOS devices
npx expo run:ios --device

# Build and run on a specific device by name
npx expo run:ios --device "M7md2"

# Or use the device ID
npx expo run:ios --device "00008110-000A61D23A9A401E"
```

### Option 2: Using Xcode
1. Open the project in Xcode:
   ```bash
   open ios/Steps.xcworkspace
   ```
2. In Xcode:
   - Select your device from the device dropdown (top toolbar)
   - Click the "Play" button or press `Cmd + R`

### Option 3: Using Device Name Pattern
```bash
# Build for device matching a pattern
npx expo run:ios --device "M7md*"
```

## iOS - Simulator

### List Available Simulators
```bash
xcrun simctl list devices available
```

### Build for Specific Simulator
```bash
# Build for iPhone 15 Pro Simulator
npx expo run:ios --simulator "iPhone 15 Pro"

# Build for iPhone 16 Pro Simulator (iOS 18.1)
npx expo run:ios --simulator "iPhone 16 Pro Simulator"

# Or use the UDID
npx expo run:ios --simulator "2F5B0965-ACBF-4DBB-A618-6FBE82CE33CB"
```

## Android - Physical Device

### Step 1: Connect Device
1. Enable USB Debugging on your Android device
2. Connect via USB
3. Verify connection:
   ```bash
   adb devices
   ```

### Step 2: Build and Run
```bash
# List all connected devices
adb devices

# Build and run on connected device
npx expo run:android

# Or specify device by ID
npx expo run:android --device <device-id>
```

### Step 3: Using Android Studio
1. Open Android Studio
2. Open the `android` folder
3. Select your device from the device dropdown
4. Click "Run" or press `Shift + F10`

## Android - Emulator

### List Available Emulators
```bash
emulator -list-avds
```

### Start Specific Emulator
```bash
# Start a specific emulator
emulator -avd <emulator-name>

# Then build
npx expo run:android
```

## Quick Reference

### Current Available Devices

**iOS Physical:**
- M7md2 (00008110-000A61D23A9A401E) - Currently connecting

**iOS Simulators:**
- iPhone 15 Pro (17.2, 17.5)
- iPhone 16 Pro (18.0, 18.1, 18.5)
- iPhone 17 Pro (26.0, 26.1)
- And many more...

**Android:**
- No devices currently connected

## Troubleshooting

### iOS Device Not Showing
1. Trust the computer on your device
2. Unlock your device
3. Check if device is in Developer Mode
4. Try: `xcrun devicectl list devices`

### Android Device Not Detected
1. Enable USB Debugging: Settings → Developer Options → USB Debugging
2. Install USB drivers (Windows)
3. Try: `adb kill-server && adb start-server`
4. Check: `adb devices` should show your device

### Build Errors
- Make sure you've run `npm install` or `yarn install`
- For iOS: `cd ios && pod install && cd ..`
- Clear cache: `npx expo start -c`

