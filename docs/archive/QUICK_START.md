# Quick Start - Git Commands & Testing

## ✅ Backend Code is Fixed!

The file `/Users/aghone01/Documents/CS/OneCrew_BE/OneCrewBE/src/domains/chat/routes/chat.ts` has been updated with the fix.

## 🚀 Run These Commands in Your Terminal:

### Step 1: Commit Backend Changes

```bash
cd /Users/aghone01/Documents/CS/OneCrew_BE/OneCrewBE

git checkout -b feature/fix-stream-chat-token-endpoint

git add src/domains/chat/routes/chat.ts

git commit -m "Fix Stream Chat token endpoint to return formatted user_id

- Format user_id as onecrew_user_{id} or onecrew_company_{id}
- Use formatted ID for token generation
- Support both STREAM_CHAT_API_KEY and STREAM_API_KEY env vars
- Fixes frontend connection issue"

git push origin feature/fix-stream-chat-token-endpoint
```

### Step 2: Test Endpoint (Current State)

```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
./test-stream-chat.sh
```

This will show if the endpoint works (may show unformatted user_id until deployed).

### Step 3: Test on iOS Simulator

```bash
cd /Users/aghone01/Documents/CS/OneCrewApp

# Start Metro bundler
npx expo start --clear

# In another terminal window, run:
npx expo run:ios
```

### Step 4: Test Chat in App

1. **Login:**
   - Email: `ghoneem77@gmail.com`
   - Password: `password123`

2. **Navigate to Messages tab**

3. **Watch terminal logs** for:
   ```
   💬 [StreamChatProvider] Initializing StreamChat...
   ✅ StreamChat token retrieved successfully
   ✅ StreamChat: User connected successfully
   ```

4. **Test Features:**
   - Create conversation
   - Send message
   - Verify messages appear

## ⚠️ Important Note

The backend fix is **local only** right now. It needs to be:
1. ✅ Committed (you're doing this now)
2. ⏳ Pushed to GitHub
3. ⏳ Deployed to production

Once deployed, the endpoint will return the correct formatted `user_id` and the frontend will connect successfully.

## 📝 What Changed

**Before:**
```typescript
user_id: userId  // Returns: "dda3aaa6-d123-4e57-aeef-f0661ec61352"
```

**After:**
```typescript
user_id: streamUserId  // Returns: "onecrew_user_dda3aaa6-d123-4e57-aeef-f0661ec61352"
```

This matches what the frontend expects!

