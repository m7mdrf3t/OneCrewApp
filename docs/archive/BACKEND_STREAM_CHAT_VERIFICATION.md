# Backend Stream Chat Implementation Verification Guide

This guide helps you verify that the backend GetStream chat implementation in [OneCrewBE](https://github.com/m7mdrf3t/OneCrewBE.git) is correct and ready for Android/iOS testing.

## 🔍 Backend Requirements Checklist

### 1. **Token Endpoint Implementation**

**Required Endpoint:**
```
POST /api/chat/token
```

**Expected Behavior:**
- ✅ Requires JWT authentication (Bearer token in Authorization header)
- ✅ Generates Stream Chat JWT token for authenticated user
- ✅ Returns proper response format

**Expected Response Format:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user_id": "onecrew_user_{userId}" or "onecrew_company_{companyId}",
    "api_key": "gjs4e7pmvpum"  // Optional but recommended
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message here"
}
```

### 2. **Backend Code to Verify**

In the OneCrewBE repository, check for:

#### **Route File** (likely in `src/routes/chat.ts` or similar):
```typescript
router.post('/api/chat/token', authenticateJWT, chatController.getStreamChatToken);
```

#### **Controller** (likely in `src/controllers/chatController.ts` or similar):
```typescript
async getStreamChatToken(req: Request, res: Response) {
  try {
    const userId = req.user.id; // From JWT
    const userType = req.user.type || 'user'; // 'user' or 'company'
    
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
        api_key: streamApiKey
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

#### **Stream Client Setup** (likely in `src/services/streamChatService.ts` or similar):
```typescript
import { StreamChat } from 'stream-chat';

const streamClient = StreamChat.getInstance(
  process.env.STREAM_CHAT_API_KEY!,
  process.env.STREAM_CHAT_SECRET!
);
```

### 3. **Environment Variables Required**

Check `.env` file in backend:
```env
STREAM_CHAT_API_KEY=gjs4e7pmvpum
STREAM_CHAT_SECRET=your_stream_secret_key
```

### 4. **User ID Format**

The backend should generate Stream Chat user IDs in this format:
- **Regular users**: `onecrew_user_{userId}`
- **Companies**: `onecrew_company_{companyId}`

This matches the frontend mapping in `src/utils/streamChatMapping.ts`.

## 🧪 Testing Guide

### **Step 1: Test Backend Endpoint Directly**

#### Using cURL:
```bash
# Replace YOUR_JWT_TOKEN with actual token from login
curl -X POST http://localhost:3000/api/chat/token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Using Postman:
1. Method: `POST`
2. URL: `http://localhost:3000/api/chat/token`
3. Headers:
   - `Content-Type: application/json`
   - `Authorization: Bearer YOUR_JWT_TOKEN`
4. Expected Response:
   ```json
   {
     "success": true,
     "data": {
       "token": "...",
       "user_id": "onecrew_user_123",
       "api_key": "gjs4e7pmvpum"
     }
   }
   ```

### **Step 2: Test from Frontend**

#### Test on iOS Simulator:
```bash
# Start Metro bundler
npm start

# Run on iOS
npm run ios
```

#### Test on Android Emulator:
```bash
# Start Metro bundler
npm start

# Run on Android
npm run android
```

#### What to Check:
1. ✅ Login successfully
2. ✅ Check console logs for: `💬 Getting StreamChat token...`
3. ✅ Verify token response: `✅ StreamChat token retrieved successfully`
4. ✅ Check for: `🔑 StreamChat: Setting API key from backend`
5. ✅ Verify connection: `✅ StreamChat: User connected successfully`
6. ✅ Navigate to Messages/Conversations
7. ✅ Create a new conversation
8. ✅ Send a message
9. ✅ Receive messages in real-time

### **Step 3: Debug Logging**

Enable debug logging in frontend by adding to `ApiContext.tsx`:
```typescript
// In getStreamChatToken function, add:
console.log('🔍 Token Response:', JSON.stringify(response, null, 2));
```

Check for these logs:
- `💬 StreamChat token response:` - Should show `hasToken: true`, `hasUserId: true`, `hasApiKey: true`
- `🔑 StreamChat: Creating client with API key:`
- `🔌 StreamChat: Connecting user`
- `✅ StreamChat: User connected successfully`

## 🐛 Common Issues & Solutions

### Issue 1: "StreamChat API key is required"
**Cause:** Backend not returning `api_key` in response
**Solution:** Ensure backend returns `api_key` field in token response

### Issue 2: "Failed to get StreamChat token"
**Cause:** Backend endpoint not working or authentication failing
**Solution:** 
- Verify JWT token is valid
- Check backend logs for errors
- Verify endpoint is `POST /api/chat/token` (not GET)

### Issue 3: "Channel not available"
**Cause:** Backend not creating Stream Chat channels when conversations are created
**Solution:** Backend should create Stream Chat channels when `POST /api/chat/conversations` is called

### Issue 4: "User ID format mismatch"
**Cause:** Backend generating different user ID format than frontend expects
**Solution:** Ensure backend uses format: `onecrew_user_{id}` or `onecrew_company_{id}`

## 📋 Backend Implementation Checklist

Before testing on Android/iOS, verify:

- [ ] Backend has `POST /api/chat/token` endpoint
- [ ] Endpoint requires JWT authentication
- [ ] Endpoint returns `{ success: true, data: { token, user_id, api_key } }`
- [ ] Stream Chat SDK is installed: `npm install stream-chat`
- [ ] Environment variables are set: `STREAM_CHAT_API_KEY` and `STREAM_CHAT_SECRET`
- [ ] User ID format matches: `onecrew_user_{id}` or `onecrew_company_{id}`
- [ ] Backend creates Stream Chat channels when conversations are created
- [ ] Backend adds members to channels correctly
- [ ] Error handling is implemented

## 🚀 Quick Test Script

Create a test file `test-stream-chat-token.sh`:

```bash
#!/bin/bash

# Configuration
BASE_URL="http://localhost:3000"
JWT_TOKEN="YOUR_JWT_TOKEN_HERE"

echo "🧪 Testing Stream Chat Token Endpoint..."
echo ""

# Test token endpoint
echo "📤 Requesting token..."
RESPONSE=$(curl -s -X POST "${BASE_URL}/api/chat/token" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}")

echo "📥 Response:"
echo "$RESPONSE" | jq '.'

# Check if successful
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
  echo ""
  echo "✅ Token endpoint working correctly!"
  echo ""
  TOKEN=$(echo "$RESPONSE" | jq -r '.data.token')
  USER_ID=$(echo "$RESPONSE" | jq -r '.data.user_id')
  API_KEY=$(echo "$RESPONSE" | jq -r '.data.api_key')
  
  echo "Token: ${TOKEN:0:50}..."
  echo "User ID: $USER_ID"
  echo "API Key: $API_KEY"
else
  echo ""
  echo "❌ Token endpoint failed!"
  ERROR=$(echo "$RESPONSE" | jq -r '.error')
  echo "Error: $ERROR"
fi
```

Make it executable and run:
```bash
chmod +x test-stream-chat-token.sh
./test-stream-chat-token.sh
```

## 📱 Platform-Specific Testing

### iOS Testing:
1. Open Xcode
2. Build and run on simulator or device
3. Check Xcode console for logs
4. Test on iOS 15+ and iOS 17+

### Android Testing:
1. Open Android Studio
2. Build and run on emulator or device
3. Check Logcat for logs (filter by "StreamChat")
4. Test on Android 10+ and Android 13+

## 🔗 Related Files in Frontend

- `src/contexts/ApiContext.tsx` - API calls
- `src/services/StreamChatService.ts` - Stream Chat client management
- `src/components/StreamChatProvider.tsx` - Stream Chat context provider
- `src/pages/ChatPage.tsx` - Chat UI
- `src/pages/ConversationsListPage.tsx` - Conversations list
- `src/config/streamChat.ts` - Configuration
- `src/utils/streamChatMapping.ts` - ID mapping utilities

## 📚 Additional Resources

- [Stream Chat Documentation](https://getstream.io/chat/docs/)
- [Stream Chat React Native SDK](https://github.com/GetStream/stream-chat-react-native)
- [OneCrewBE Repository](https://github.com/m7mdrf3t/OneCrewBE.git)

---

**Next Steps:**
1. Clone and review the backend repository
2. Verify the endpoint implementation matches this guide
3. Test the endpoint using the provided scripts
4. Test on iOS and Android devices
5. Monitor logs for any issues

