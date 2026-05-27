# iOS Simulator Testing Guide - Stream Chat

## Prerequisites

1. ✅ Backend endpoint fix is deployed
2. ✅ Endpoint test passes (returns formatted user_id)
3. ✅ iOS app is built and ready

## Testing Steps

### Step 1: Start Metro Bundler

```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
npx expo start --clear
```

Wait for Metro to start and show "Metro waiting on http://localhost:8081"

### Step 2: Run iOS Simulator

In another terminal:

```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
npx expo run:ios
```

Or if Metro is already running, press `i` in the Metro terminal.

### Step 3: Login to App

1. Open the app in simulator
2. Login with:
   - Email: `ghoneem77@gmail.com`
   - Password: `password123`

### Step 4: Watch Terminal Logs

Look for these logs in the Metro terminal:

**Success Logs:**
```
💬 [StreamChatProvider] Initializing StreamChat...
💬 Getting StreamChat token...
✅ StreamChat token retrieved successfully
💬 [StreamChatProvider] Token response: {
  success: true,
  hasData: true,
  hasToken: true,
  hasUserId: true,
  hasApiKey: true
}
💬 [StreamChatProvider] Connecting user...
✅ StreamChat: User connected successfully
✅ [StreamChatProvider] Client already connected
```

**Error Logs (if issues):**
```
❌ Failed to get StreamChat token: ...
❌ [StreamChatProvider] Failed to initialize: ...
```

### Step 5: Navigate to Messages

1. Tap on "Messages" tab in the app
2. Should see conversations list (may be empty if no conversations)
3. Should NOT see "Connecting to chat..." loading state

### Step 6: Test Chat Features

1. **Create Conversation:**
   - Tap "+" button or navigate to Directory
   - Select a user to message
   - Should create/open conversation

2. **Send Message:**
   - Type a message
   - Send it
   - Message should appear in chat

3. **Receive Messages:**
   - If you have another device/account, send from there
   - Message should appear in real-time

## Expected Behavior

### ✅ Success Indicators:
- No "Route /api/chat/token not found" error
- No "Connecting to chat..." stuck loading
- Conversations list loads (even if empty)
- Can create new conversations
- Can send messages
- Messages appear in real-time

### ❌ Failure Indicators:
- Stuck on "Connecting to chat..." screen
- Error messages in terminal
- Cannot create conversations
- Cannot send messages

## Troubleshooting

### Issue: Still shows "Connecting to chat..."
**Possible causes:**
1. Backend not deployed yet - wait for deployment
2. Endpoint returns wrong user_id format - verify backend fix is deployed
3. Network issues - check internet connection

**Solution:**
- Check terminal logs for specific errors
- Verify endpoint test passes
- Wait for backend deployment

### Issue: "Route /api/chat/token not found"
**Possible causes:**
1. Backend fix not deployed
2. Wrong backend URL

**Solution:**
- Verify backend is deployed with latest changes
- Check backend logs

### Issue: "User ID format incorrect"
**Possible causes:**
1. Backend fix not deployed
2. Backend using wrong user type detection

**Solution:**
- Verify backend code uses `onecrew_${userType}_${userId}` format
- Check if `req.user.category` or `req.user.type` is correct

## Test Checklist

- [ ] Metro bundler starts successfully
- [ ] iOS simulator launches app
- [ ] Login works
- [ ] No errors in terminal on app launch
- [ ] StreamChatProvider initializes successfully
- [ ] Token retrieved successfully
- [ ] User connected to Stream Chat
- [ ] Messages tab loads (no loading spinner)
- [ ] Can navigate to chat conversations
- [ ] Can create new conversation
- [ ] Can send message
- [ ] Message appears in chat

## Next Steps After Testing

1. If all tests pass: ✅ Stream Chat is working!
2. If issues found: Document errors and troubleshoot
3. Test on Android device as well
4. Test with multiple users/conversations

