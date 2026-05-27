# Backend Stream Chat Token Endpoint - Fix Applied

## ✅ Status: Fixed

The `/api/chat/token` endpoint has been **updated** to return the correct user ID format.

## 🔧 Changes Made

### File: `src/domains/chat/routes/chat.ts`

**Before:**
- Used raw `userId` directly
- Returned `user_id: userId` (not formatted)
- Only checked `STREAM_API_KEY`

**After:**
- Formats user ID as `onecrew_user_{userId}` or `onecrew_company_{companyId}`
- Uses formatted ID for token generation
- Returns formatted `user_id` in response
- Supports both `STREAM_CHAT_API_KEY` and `STREAM_API_KEY` (backward compatible)

### Key Changes:

1. **User ID Formatting:**
   ```typescript
   const userType = (req.user as any)?.type || 'user';
   const streamUserId = `onecrew_${userType}_${userId}`;
   ```

2. **Token Generation:**
   ```typescript
   const token = await StreamChatService.generateToken(streamUserId);
   ```

3. **Response:**
   ```typescript
   {
     success: true,
     data: {
       token,
       user_id: streamUserId, // Now returns formatted ID
       api_key: streamApiKey
     }
   }
   ```

4. **Environment Variable Support:**
   ```typescript
   const streamApiKey = process.env.STREAM_CHAT_API_KEY || process.env.STREAM_API_KEY;
   ```

## 📋 Next Steps

### 1. Create Git Branch

```bash
cd /Users/aghone01/Documents/CS/OneCrew_BE/OneCrewBE
git checkout -b feature/fix-stream-chat-token-endpoint
```

### 2. Verify Changes

```bash
# Check the diff
git diff src/domains/chat/routes/chat.ts
```

### 3. Commit Changes

```bash
git add src/domains/chat/routes/chat.ts
git commit -m "Fix Stream Chat token endpoint to return formatted user_id

- Format user_id as onecrew_user_{id} or onecrew_company_{id}
- Use formatted ID for token generation
- Support both STREAM_CHAT_API_KEY and STREAM_API_KEY env vars
- Fixes frontend connection issue"
```

### 4. Push to Remote

```bash
git push origin feature/fix-stream-chat-token-endpoint
```

### 5. Create Pull Request

Create a PR on GitHub to merge into `main` or `develop` branch.

## 🧪 Testing

After deployment, test the endpoint:

```bash
# Get JWT token
TOKEN=$(curl -s -X POST https://onecrew-backend-309236356616.us-central1.run.app/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"ghoneem77@gmail.com","password":"password123"}' \
  | jq -r '.data.token')

# Test chat token endpoint
curl -X POST https://onecrew-backend-309236356616.us-central1.run.app/api/chat/token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user_id": "onecrew_user_dda3aaa6-d123-4e57-aeef-f0661ec61352",
    "api_key": "gjs4e7pmvpum"
  }
}
```

## ✅ Verification Checklist

- [x] Endpoint returns formatted `user_id` (onecrew_user_{id})
- [x] Token is generated using formatted user ID
- [x] Environment variable support for both STREAM_CHAT_API_KEY and STREAM_API_KEY
- [x] Error handling for missing API key
- [ ] Branch created
- [ ] Changes committed
- [ ] Pull request created
- [ ] Endpoint tested after deployment
- [ ] Frontend connects successfully

## 📝 Notes

- The endpoint was already implemented but was returning the wrong user ID format
- The frontend expects `onecrew_user_{userId}` format based on `STREAM_USER_PREFIX`
- This fix ensures compatibility with the frontend StreamChat integration

