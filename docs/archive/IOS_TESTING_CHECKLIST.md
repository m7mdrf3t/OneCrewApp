# iOS Testing Checklist - Stream Chat Integration

## ✅ What to Check in iOS Logs

When the app starts on iOS, look for these log messages in order:

### 1. **App Initialization**
```
✅ App started successfully
```

### 2. **Authentication**
```
✅ Login successful
```

### 3. **Stream Chat Token Request**
```
💬 Getting StreamChat token...
✅ StreamChat token retrieved successfully
```

### 4. **Stream Chat Token Response Details**
```
💬 StreamChat token response: {
  hasToken: true,
  hasUserId: true,
  hasApiKey: true,
  userId: "onecrew_user_...",
  apiKeyPrefix: "gjs4e7pmvp..."
}
```

### 5. **Stream Chat Client Initialization**
```
🔑 StreamChat: Setting API key from backend
🔑 StreamChat: Creating client with API key: gjs4e7pmvp...
```

### 6. **Stream Chat Connection**
```
🔌 StreamChat: Connecting user onecrew_user_...
✅ StreamChat: User connected successfully
✅ StreamChat initialized after login
```

### 7. **StreamChatProvider Ready**
```
✅ StreamChat provider initialized
```

## 🐛 Common Issues to Watch For

### Issue 1: Token Request Fails
**Logs:**
```
❌ Failed to get StreamChat token: [error message]
```

**Possible Causes:**
- Backend endpoint not working
- JWT token expired
- Network connection issue

**Solution:**
- Check backend is running
- Verify JWT token is valid
- Check network connectivity

### Issue 2: Missing API Key
**Logs:**
```
⚠️ StreamChat: Using fallback API key (backend did not provide api_key)
```

**Impact:** Should still work, but backend should provide api_key

### Issue 3: Connection Failed
**Logs:**
```
❌ StreamChat: Failed to connect user [error]
```

**Possible Causes:**
- Invalid token
- Wrong API key
- Stream Chat service issue

**Solution:**
- Verify token is valid
- Check API key matches Stream dashboard
- Check Stream Chat service status

### Issue 4: Channel Not Found
**Logs:**
```
⚠️ Channel not found in StreamChat
❌ Failed to watch channel
```

**Possible Causes:**
- Backend hasn't created channel yet
- Channel ID mismatch

**Solution:**
- Wait a few seconds and retry
- Check backend creates channels when conversations are created

## 📱 Testing Flow

### Step 1: Login
1. Enter credentials
2. Tap Login
3. **Check logs:** Should see login success and Stream Chat token request

### Step 2: Navigate to Messages
1. Tap Messages/Conversations tab
2. **Check logs:** Should see StreamChat provider initialization

### Step 3: Create Conversation
1. Tap + or find a user
2. Start a conversation
3. **Check logs:** Should see channel creation/watching

### Step 4: Send Message
1. Type a message
2. Tap Send
3. **Check logs:** Should see message sent confirmation

### Step 5: Receive Message
1. Have another user send you a message
2. **Check logs:** Should see real-time message received

## 🔍 How to View Logs

### Option 1: Metro Bundler Terminal
- Logs appear in the terminal where you ran `npm start`
- Look for messages starting with emojis (💬, ✅, ❌, ⚠️)

### Option 2: Xcode Console
1. Open Xcode
2. Window → Devices and Simulators
3. Select your simulator
4. Click "Open Console"
5. Filter by "StreamChat" or "OneCrew"

### Option 3: React Native Debugger
1. Press `j` in Metro bundler to open debugger
2. Check Console tab
3. Filter by "StreamChat"

## ✅ Success Indicators

If everything is working, you should see:

1. ✅ Login successful
2. ✅ StreamChat token retrieved
3. ✅ StreamChat client created
4. ✅ User connected to StreamChat
5. ✅ Conversations list loads
6. ✅ Can create new conversations
7. ✅ Can send messages
8. ✅ Can receive messages in real-time
9. ✅ Typing indicators work
10. ✅ Read receipts work

## 🚨 Red Flags

Watch out for these error patterns:

- Multiple failed token requests
- Connection timeouts
- "Channel not available" errors
- "API key required" errors
- Authentication failures

## 📊 Expected Log Sequence

Here's the complete expected log sequence:

```
[App Start]
✅ App initialized

[Login]
📤 Logging in...
✅ Login successful
💬 Getting StreamChat token...
✅ StreamChat token retrieved successfully
💬 StreamChat token response: { hasToken: true, hasUserId: true, hasApiKey: true }
🔑 StreamChat: Setting API key from backend
🔑 StreamChat: Creating client with API key: gjs4e7pmvp...
🔌 StreamChat: Connecting user onecrew_user_123
✅ StreamChat: User connected successfully
✅ StreamChat initialized after login

[Navigate to Messages]
💬 [ConversationsListPage] Loading conversations...
✅ StreamChat provider initialized

[Create Conversation]
💬 Creating conversation...
✅ Conversation created
💬 [ChatPage] Channel watched successfully

[Send Message]
💬 Sending message...
✅ Message sent
```

---

**Current Status:** Monitor the terminal/logs and check if you see the success indicators above!

