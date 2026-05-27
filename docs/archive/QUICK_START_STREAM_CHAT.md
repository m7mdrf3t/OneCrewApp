# Quick Start: Stream Chat Testing with New Network IP

## ✅ Already Fixed
- API Base URL updated to `192.168.100.92:3000`
- Android manifest Firebase conflict resolved

## 🚀 Start Testing (3 Terminal Windows)

### Terminal 1: Metro Bundler
```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
npx expo start --clear --host lan
```

**Wait for Metro to show:**
```
Metro waiting on exp://192.168.100.92:8081
```

### Terminal 2: iOS Simulator
```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
npx expo run:ios
```

**If you see "Could not connect to development server":**
1. In simulator: Press `Cmd+D` (or shake device)
2. Select "Configure Bundler"
3. Enter: `http://192.168.100.92:8081`
4. Press "Reload"

### Terminal 3: Android Emulator
```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
npx expo run:android
```

**Note:** The Firebase error on Android can be **ignored** for Stream Chat testing. Firebase is only needed for push notifications, not for messaging.

## 🧪 Test Stream Chat

### Step 1: Sign In on Both Simulators
- **iOS**: Sign in with Account 1 (e.g., `ghoneem77@gmail.com`)
- **Android**: Sign in with Account 2 (different account)

### Step 2: Navigate to Messages
- Both simulators: Tap "Messages" tab
- Should see "Connecting to chat..." briefly, then conversation list

### Step 3: Start Conversation
- **iOS**: Tap a user → Start chat
- **Android**: Should see the new conversation appear
- **Android**: Tap conversation → Reply

### Step 4: Verify Real-Time Messaging
- ✅ Messages appear instantly on both devices
- ✅ Message input is visible and functional
- ✅ Backend logs show token requests

## 🔍 Troubleshooting

### iOS: Metro Connection Error
**Error:** "Could not connect to development server"

**Fix:**
```bash
# Stop Metro (Ctrl+C)
# Restart with explicit host
npx expo start --clear --host lan

# In simulator: Cmd+D → Configure Bundler → http://192.168.100.92:8081
```

### Android: Firebase Error
**Error:** "No Firebase App"

**Status:** ✅ **IGNORE THIS** - Firebase is optional for Stream Chat. The app will still work for messaging.

**To fix later (optional):**
1. Get `google-services.json` from Firebase Console
2. Place in `android/app/google-services.json`
3. Rebuild: `npx expo run:android`

### Backend Not Accessible
**Check:**
```bash
curl http://192.168.100.92:3000/api/health
# Should return: {"status":"ok"}
```

**If not accessible:**
1. Verify backend is running in your other Cursor project
2. Check backend is listening on `0.0.0.0:3000` (not just `localhost:3000`)
3. Check firewall allows port 3000

### Stream Chat Token Errors
**Check backend logs for:**
- JWT signature errors → Verify Stream Chat secret in backend `.env`
- 404 errors → Verify endpoint `/api/chat/token` exists
- Connection errors → Verify backend is accessible

## 📝 Connection URLs

| Service | URL |
|---------|-----|
| Metro Bundler | `http://192.168.100.92:8081` |
| Backend API | `http://192.168.100.92:3000` |
| Stream Chat Token | `http://192.168.100.92:3000/api/chat/token` |

## ✅ Success Indicators

- ✅ Both simulators load the app
- ✅ Both can sign in
- ✅ Messages tab loads without "Connecting..." stuck
- ✅ Can create conversations
- ✅ Messages send and receive in real-time
- ✅ Message input is visible and functional

## 🎯 Next Steps After Testing

1. **If everything works:**
   - Deploy backend changes to production
   - Update production API URL in app
   - Test on physical devices

2. **If issues persist:**
   - Check backend logs for Stream Chat errors
   - Verify Stream Chat credentials in backend
   - Check network connectivity between devices

