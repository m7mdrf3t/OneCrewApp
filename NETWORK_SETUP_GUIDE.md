# Network Setup Guide - Updated IP Configuration

## ✅ Changes Made

1. **API Base URL Updated**: Changed from `172.23.179.222:3000` to `192.168.100.92:3000`
   - File: `src/contexts/ApiContext.tsx` (line 449)

## 🔧 Setup Steps

### Step 1: Start Metro Bundler

Metro needs to be accessible on your network IP. Run this command:

```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0 npx expo start --clear --host tunnel
```

**Alternative (if tunnel doesn't work):**
```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
npx expo start --clear --host lan
```

This will:
- Clear Metro cache
- Make Metro accessible on your network IP (`192.168.100.92`)
- Show a QR code and connection URLs

### Step 2: Verify Backend is Running

Your backend should be running on:
- **Local**: `http://localhost:3000`
- **Network**: `http://192.168.100.92:3000`

Test the backend:
```bash
curl http://192.168.100.92:3000/api/health
```

### Step 3: Run iOS Simulator

In a **new terminal window** (keep Metro running):

```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
npx expo run:ios
```

The simulator should automatically connect to Metro. If it shows connection error:
1. Shake the device (Cmd+Ctrl+Z) or press Cmd+D
2. Select "Configure Bundler"
3. Enter: `http://192.168.100.92:8081`

### Step 4: Run Android Emulator

In a **new terminal window** (keep Metro running):

```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
npx expo run:android
```

For Android emulator, the backend URL should be:
- **Android Emulator**: `http://10.0.2.2:3000` (special IP that maps to host's localhost)

But since you're using network IP, you might need to use `http://192.168.100.92:3000` directly.

### Step 5: Fix Firebase Error (Android)

The Firebase error on Android is likely because `google-services.json` is missing or not properly configured. For **Stream Chat testing**, Firebase is **optional** - you can ignore this error for now.

If you want to fix it:
1. Get `google-services.json` from Firebase Console
2. Place it in: `android/app/google-services.json`
3. Rebuild: `npx expo run:android`

## 🧪 Testing Stream Chat Between Two Accounts

### Account 1 (iOS Simulator)
1. Sign in with first account
2. Navigate to Messages
3. Start a conversation with Account 2

### Account 2 (Android Emulator)
1. Sign in with second account
2. Navigate to Messages
3. Accept/reply to conversation from Account 1

### Expected Behavior
- ✅ Messages should appear in real-time
- ✅ Both users should see each other's messages
- ✅ Message input should be visible and functional
- ✅ Backend logs should show Stream Chat token requests

## 🔍 Troubleshooting

### iOS: "Could not connect to development server"

**Solution:**
1. Make sure Metro is running with `--host lan` or `--host tunnel`
2. In simulator, shake device → "Configure Bundler" → Enter: `http://192.168.100.92:8081`
3. Or restart Metro: `npx expo start --clear --host lan`

### Android: Firebase Error

**For Stream Chat testing**: This error can be ignored. Firebase is only needed for push notifications, not for Stream Chat messaging.

**To fix (optional):**
1. Ensure `android/app/google-services.json` exists
2. Rebuild: `npx expo run:android`

### Backend Connection Issues

**Check backend is accessible:**
```bash
# From your Mac
curl http://192.168.100.92:3000/api/health

# Should return: {"status":"ok"}
```

**If backend is not accessible:**
1. Check backend is running: `ps aux | grep node`
2. Check firewall allows port 3000
3. Verify IP address: `ifconfig | grep "inet "`

### Stream Chat Token Errors

**If you see JWT errors:**
1. Verify backend has correct Stream Chat credentials:
   - API Key: `j8yy2mzarh3n`
   - Secret: `zyjb2pp4ecxf5fpmnu3ekv5zzugs4uhmz92s3t583earzby3s6cesbtjyrjyesba`
2. Restart backend after updating `.env`
3. Check backend logs for token generation errors

## 📝 Connection URLs Summary

| Platform | Metro Bundler | Backend API |
|----------|---------------|-------------|
| iOS Simulator | `http://192.168.100.92:8081` | `http://192.168.100.92:3000` |
| Android Emulator | `http://192.168.100.92:8081` | `http://192.168.100.92:3000` |
| Physical Device | `http://192.168.100.92:8081` | `http://192.168.100.92:3000` |

## ✅ Quick Start Commands

```bash
# Terminal 1: Start Metro
cd /Users/aghone01/Documents/CS/OneCrewApp
npx expo start --clear --host lan

# Terminal 2: Run iOS
cd /Users/aghone01/Documents/CS/OneCrewApp
npx expo run:ios

# Terminal 3: Run Android
cd /Users/aghone01/Documents/CS/OneCrewApp
npx expo run:android
```

Keep all three terminals running while testing!

