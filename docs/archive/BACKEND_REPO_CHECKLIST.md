# Backend Repository (OneCrewBE) Verification Checklist

This checklist helps you verify the GetStream chat implementation in the [OneCrewBE repository](https://github.com/m7mdrf3t/OneCrewBE.git).

## 📋 Files to Check in Backend Repository

### 1. **Route Configuration**

**Location:** `src/routes/chat.ts` or `src/routes/index.ts`

**What to verify:**
```typescript
// Should have this route
router.post('/api/chat/token', authenticateJWT, chatController.getStreamChatToken);
```

**Check:**
- [ ] Route exists: `POST /api/chat/token`
- [ ] Uses JWT authentication middleware
- [ ] Points to correct controller method

### 2. **Controller Implementation**

**Location:** `src/controllers/chatController.ts` or similar

**What to verify:**
```typescript
async getStreamChatToken(req: Request, res: Response) {
  try {
    const userId = req.user.id;
    const userType = req.user.type || 'user';
    
    // Generate Stream Chat user ID
    const streamUserId = `onecrew_${userType}_${userId}`;
    
    // Generate token using Stream SDK
    const streamToken = streamClient.createToken(streamUserId);
    
    // Get API key from environment
    const streamApiKey = process.env.STREAM_CHAT_API_KEY;
    
    res.json({
      success: true,
      data: {
        token: streamToken,
        user_id: streamUserId,
        api_key: streamApiKey  // Important: include this
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
```

**Check:**
- [ ] Method exists: `getStreamChatToken`
- [ ] Extracts user ID from JWT (`req.user.id`)
- [ ] Generates user ID in format: `onecrew_user_{id}` or `onecrew_company_{id}`
- [ ] Uses Stream SDK to create token: `streamClient.createToken()`
- [ ] Returns `api_key` in response (recommended)
- [ ] Returns proper error format on failure

### 3. **Stream Chat Service/Client**

**Location:** `src/services/streamChatService.ts` or `src/config/streamChat.ts`

**What to verify:**
```typescript
import { StreamChat } from 'stream-chat';

const streamClient = StreamChat.getInstance(
  process.env.STREAM_CHAT_API_KEY!,
  process.env.STREAM_CHAT_SECRET!
);

export default streamClient;
```

**Check:**
- [ ] Stream Chat SDK is imported
- [ ] Client is initialized with API key and secret
- [ ] Uses environment variables: `STREAM_CHAT_API_KEY` and `STREAM_CHAT_SECRET`
- [ ] Client is exported and used in controller

### 4. **Environment Variables**

**Location:** `.env` or `.env.example`

**What to verify:**
```env
STREAM_CHAT_API_KEY=gjs4e7pmvpum
STREAM_CHAT_SECRET=your_secret_key_here
```

**Check:**
- [ ] `STREAM_CHAT_API_KEY` is set
- [ ] `STREAM_CHAT_SECRET` is set
- [ ] Values match your Stream Chat dashboard
- [ ] `.env.example` documents these variables

### 5. **Package Dependencies**

**Location:** `package.json`

**What to verify:**
```json
{
  "dependencies": {
    "stream-chat": "^9.0.0"
  }
}
```

**Check:**
- [ ] `stream-chat` package is listed in dependencies
- [ ] Version is compatible (9.x or higher)

### 6. **Conversation Creation (Channel Sync)**

**Location:** `src/controllers/chatController.ts` - `createConversation` method

**What to verify:**
When a conversation is created via `POST /api/chat/conversations`, the backend should:
1. Create conversation in database
2. Create corresponding Stream Chat channel
3. Add members to the channel

**Check:**
- [ ] Backend creates Stream Chat channel when conversation is created
- [ ] Channel ID format matches: `messaging:onecrew_{conversationId}`
- [ ] Members are added to the channel
- [ ] Channel type is `messaging`

### 7. **Message Sending (Channel Sync)**

**Location:** `src/controllers/chatController.ts` - `sendMessage` method

**What to verify:**
When a message is sent, it should be synced to Stream Chat.

**Check:**
- [ ] Messages are sent to Stream Chat channel
- [ ] Message format matches Stream Chat requirements
- [ ] Sender information is correctly mapped

## 🔍 How to Check the Repository

### Step 1: Clone the Repository
```bash
git clone https://github.com/m7mdrf3t/OneCrewBE.git
cd OneCrewBE
```

### Step 2: Search for Key Files
```bash
# Find chat routes
find . -name "*.ts" -o -name "*.js" | xargs grep -l "chat/token"

# Find Stream Chat imports
find . -name "*.ts" -o -name "*.js" | xargs grep -l "stream-chat"

# Find token generation
find . -name "*.ts" -o -name "*.js" | xargs grep -l "createToken"
```

### Step 3: Check Specific Files
```bash
# Check for route files
ls -la src/routes/

# Check for controller files
ls -la src/controllers/

# Check for service files
ls -la src/services/

# Check environment example
cat .env.example | grep -i stream
```

### Step 4: Review Code
Open the files found above and verify:
1. Route is correctly defined
2. Controller method exists and is correct
3. Stream Chat client is properly initialized
4. Token generation uses correct user ID format

## 🧪 Testing the Backend

### Option 1: Use the Test Script
```bash
# From your frontend project
cd /Users/aghone01/Documents/CS/OneCrewApp
./test-stream-chat-backend.sh
```

### Option 2: Manual Testing with cURL
```bash
# 1. Login first
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 2. Use the token from step 1
curl -X POST http://localhost:3000/api/chat/token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Option 3: Test in Postman
1. Create a new request
2. Method: `POST`
3. URL: `http://localhost:3000/api/chat/token`
4. Headers:
   - `Content-Type: application/json`
   - `Authorization: Bearer YOUR_JWT_TOKEN`
5. Send request
6. Verify response contains `token`, `user_id`, and `api_key`

## ✅ Expected Backend Response

When everything is correct, the backend should return:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoib25lY3Jld191c2VyXzEyMyJ9...",
    "user_id": "onecrew_user_123",
    "api_key": "gjs4e7pmvpum"
  }
}
```

## 🐛 Common Backend Issues

### Issue 1: Route Not Found (404)
**Symptom:** `POST /api/chat/token` returns 404
**Solution:** 
- Check route is registered in main app file
- Verify route path matches exactly: `/api/chat/token`

### Issue 2: Unauthorized (401)
**Symptom:** Returns 401 Unauthorized
**Solution:**
- Check JWT authentication middleware is working
- Verify token is being sent in Authorization header
- Check token is valid and not expired

### Issue 3: Missing API Key in Response
**Symptom:** Response has `token` and `user_id` but no `api_key`
**Solution:**
- Add `api_key: process.env.STREAM_CHAT_API_KEY` to response
- Frontend can work without it, but it's recommended

### Issue 4: Wrong User ID Format
**Symptom:** User ID doesn't match `onecrew_user_*` or `onecrew_company_*`
**Solution:**
- Update backend to use format: `onecrew_${userType}_${userId}`
- Ensure `userType` is 'user' or 'company'

### Issue 5: Stream Chat SDK Error
**Symptom:** Backend throws error when creating token
**Solution:**
- Verify `STREAM_CHAT_API_KEY` and `STREAM_CHAT_SECRET` are set
- Check Stream Chat dashboard for correct credentials
- Ensure `stream-chat` package is installed

## 📱 Testing on Mobile Devices

### iOS Testing:
1. **Build and Run:**
   ```bash
   npm run ios
   ```

2. **Check Logs:**
   - Open Xcode
   - View console logs
   - Look for StreamChat connection messages

3. **Test Flow:**
   - Login
   - Navigate to Messages
   - Create conversation
   - Send message
   - Verify real-time updates

### Android Testing:
1. **Build and Run:**
   ```bash
   npm run android
   ```

2. **Check Logs:**
   ```bash
   adb logcat | grep -i streamchat
   ```

3. **Test Flow:**
   - Login
   - Navigate to Messages
   - Create conversation
   - Send message
   - Verify real-time updates

## 🔗 Related Documentation

- [Backend Stream Chat Verification Guide](./BACKEND_STREAM_CHAT_VERIFICATION.md)
- [Stream Chat Server SDK Documentation](https://getstream.io/chat/docs/node/)
- [OneCrewBE Repository](https://github.com/m7mdrf3t/OneCrewBE.git)

## 📝 Notes

- The backend should use Stream Chat's **server-side SDK** to generate tokens
- Never expose `STREAM_CHAT_SECRET` to the frontend
- User IDs must match the format expected by frontend mapping utilities
- Channels should be created automatically when conversations are created

---

**After verifying the backend:**
1. Run the test script: `./test-stream-chat-backend.sh`
2. Test on iOS device/simulator
3. Test on Android device/emulator
4. Monitor logs for any issues
5. Test all chat features (send, receive, reactions, etc.)

