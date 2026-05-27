# Backend Channel Creation Fix

## 🔴 Current Issues

1. **404 Error on Android**: Backend endpoint `/api/chat/conversations` (POST) may be missing or not working
2. **Channel Not Available on iOS**: Backend is not creating Stream Chat channels when conversations are created
3. **No Notifications**: Stream Chat push notifications are not configured

## ✅ Required Backend Implementation

### 1. Create Conversation Endpoint

**Route:** `POST /api/chat/conversations`

**What it should do:**
1. Create conversation in your database
2. **Create Stream Chat channel** (CRITICAL)
3. **Add members to the channel** (CRITICAL)
4. Return conversation data

**Example Implementation:**

```typescript
// src/domains/chat/controllers/chatController.ts
import StreamChatService from '../services/streamChatService';

export const createConversation = async (req, res, next) => {
  try {
    const { conversation_type, participant_ids, name } = req.body;
    const userId = req.user.sub;
    const userType = req.user.category || 'user';
    
    // 1. Create conversation in database
    const conversation = await Conversation.create({
      conversation_type,
      participant_ids: [...participant_ids, userId], // Include current user
      name,
      created_by: userId,
    });
    
    // 2. Create Stream Chat channel (CRITICAL)
    const streamChannelId = `onecrew_${conversation.id}`;
    const channelType = 'messaging';
    
    // Get Stream Chat client
    const streamClient = StreamChatService.getClient();
    
    // Create channel with members
    const channel = streamClient.channel(channelType, streamChannelId, {
      name: name || `Conversation ${conversation.id}`,
      members: [
        // Format user IDs as: onecrew_user_{userId} or onecrew_company_{companyId}
        ...participant_ids.map(id => `onecrew_user_${id}`),
        `onecrew_${userType}_${userId}`, // Current user
      ],
    });
    
    // Create the channel in Stream Chat
    await channel.create();
    
    // 3. Add members explicitly (ensure they're added)
    await channel.addMembers([
      ...participant_ids.map(id => `onecrew_user_${id}`),
      `onecrew_${userType}_${userId}`,
    ]);
    
    // 4. Return conversation data
    res.json({
      success: true,
      data: {
        id: conversation.id,
        conversation_type,
        participant_ids: conversation.participant_ids,
        name: conversation.name,
        created_at: conversation.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};
```

### 2. Stream Chat Service

**File:** `src/domains/chat/services/streamChatService.ts`

```typescript
import { StreamChat } from 'stream-chat';

class StreamChatService {
  private static client: StreamChat | null = null;
  
  static getClient(): StreamChat {
    if (!this.client) {
      const apiKey = process.env.STREAM_CHAT_API_KEY || process.env.STREAM_API_KEY;
      const secret = process.env.STREAM_CHAT_SECRET || process.env.STREAM_API_SECRET;
      
      if (!apiKey || !secret) {
        throw new Error('Stream Chat credentials not configured');
      }
      
      this.client = StreamChat.getInstance(apiKey, secret);
    }
    
    return this.client;
  }
  
  static async generateToken(userId: string): Promise<string> {
    const client = this.getClient();
    return client.createToken(userId);
  }
}

export default StreamChatService;
```

### 3. Environment Variables

**Backend `.env` file should have:**

```env
STREAM_CHAT_API_KEY=j8yy2mzarh3n
STREAM_CHAT_SECRET=zyjb2pp4ecxf5fpmnu3ekv5zzugs4uhmz92s3t583earzby3s6cesbtjyrjyesba
```

### 4. Route Registration

**File:** `src/domains/chat/routes/chat.ts`

```typescript
import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import * as chatController from '../controllers/chatController';

const router = Router();

// StreamChat Token Route
router.post('/token', authenticateToken, chatController.getStreamChatToken);

// Conversation Routes
router.post('/conversations', authenticateToken, chatController.createConversation);
router.get('/conversations', authenticateToken, chatController.getConversations);
router.get('/conversations/:id', authenticateToken, chatController.getConversationById);

export default router;
```

## 🔍 How to Check Your Backend

### Step 1: Verify Endpoint Exists

```bash
# Test the endpoint (replace with your JWT token)
curl -X POST "http://192.168.100.92:3000/api/chat/conversations" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_type": "user_user",
    "participant_ids": ["user_id_here"]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "conversation_id",
    "conversation_type": "user_user",
    "participant_ids": ["user_id_1", "user_id_2"],
    "name": null,
    "created_at": "2025-01-27T12:00:00Z"
  }
}
```

### Step 2: Check Backend Logs

When creating a conversation, you should see:
```
✅ Creating Stream Chat channel: onecrew_{conversationId}
✅ Channel created successfully
✅ Members added to channel
```

### Step 3: Verify Channel in Stream Chat Dashboard

1. Go to Stream Chat Dashboard: https://dashboard.getstream.io/
2. Navigate to **Chat** → **Channels**
3. Search for channel ID: `onecrew_{conversationId}`
4. Verify channel exists and has members

## 🚨 Common Issues

### Issue 1: 404 Error

**Cause:** Route not registered or wrong path

**Fix:**
1. Check `src/domains/chat/routes/chat.ts` has the route
2. Check main router includes chat routes: `app.use('/api/chat', chatRoutes)`
3. Restart backend server

### Issue 2: Channel Not Created

**Cause:** Backend doesn't create Stream Chat channel

**Fix:**
1. Ensure `createConversation` controller calls `channel.create()`
2. Check Stream Chat credentials are correct
3. Verify Stream Chat client is initialized

### Issue 3: Members Not Added

**Cause:** User IDs format mismatch

**Fix:**
- Use format: `onecrew_user_{userId}` or `onecrew_company_{companyId}`
- Must match the format used in token generation

### Issue 4: No Notifications

**Cause:** Stream Chat push notifications not configured

**Fix:**
1. Configure push notifications in Stream Chat Dashboard
2. Set up APNs (iOS) and FCM (Android) credentials
3. Enable push notifications in Stream Chat app settings

## 📝 Testing Checklist

- [ ] Backend endpoint `/api/chat/conversations` (POST) exists
- [ ] Endpoint creates conversation in database
- [ ] Endpoint creates Stream Chat channel
- [ ] Endpoint adds members to channel
- [ ] Channel ID format: `onecrew_{conversationId}`
- [ ] User IDs format: `onecrew_user_{userId}` or `onecrew_company_{companyId}`
- [ ] Stream Chat credentials are correct
- [ ] Backend logs show channel creation
- [ ] Channel appears in Stream Chat Dashboard

## 🎯 Next Steps

1. **Check your backend repository** (`https://github.com/m7mdrf3t/OneCrewBE.git`)
2. **Verify** `createConversation` controller creates Stream Chat channels
3. **Test** the endpoint with curl
4. **Check** Stream Chat Dashboard for created channels
5. **Restart** backend server after changes

## 🔗 Related Files

- Backend: `src/domains/chat/controllers/chatController.ts`
- Backend: `src/domains/chat/routes/chat.ts`
- Backend: `src/domains/chat/services/streamChatService.ts`
- Frontend: `src/pages/ChatPage.tsx` (waiting for backend to create channel)

