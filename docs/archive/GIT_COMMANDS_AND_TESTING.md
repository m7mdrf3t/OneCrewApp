# Git Commands and Testing Guide

## Step 1: Commit Backend Changes

Run these commands in your terminal:

```bash
cd /Users/aghone01/Documents/CS/OneCrew_BE/OneCrewBE

# Create branch
git checkout -b feature/fix-stream-chat-token-endpoint

# Check changes
git diff src/domains/chat/routes/chat.ts

# Commit
git add src/domains/chat/routes/chat.ts
git commit -m "Fix Stream Chat token endpoint to return formatted user_id

- Format user_id as onecrew_user_{id} or onecrew_company_{id}
- Use formatted ID for token generation
- Support both STREAM_CHAT_API_KEY and STREAM_API_KEY env vars
- Fixes frontend connection issue"

# Push
git push origin feature/fix-stream-chat-token-endpoint
```

## Step 2: Test Endpoint (Before Deployment)

Test the current endpoint to see the issue:

```bash
# Run the test script
cd /Users/aghone01/Documents/CS/OneCrewApp
./test-stream-chat.sh
```

Or manually:

```bash
# Get token
TOKEN=$(curl -s -X POST https://onecrew-backend-309236356616.us-central1.run.app/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"ghoneem77@gmail.com","password":"password123"}' \
  | jq -r '.data.token')

# Test endpoint
curl -X POST https://onecrew-backend-309236356616.us-central1.run.app/api/chat/token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq .
```

**Expected (before fix is deployed):**
- Endpoint works but returns unformatted `user_id`
- Frontend will have issues connecting

**Expected (after fix is deployed):**
- Endpoint returns formatted `user_id: "onecrew_user_{id}"`
- Frontend should connect successfully

## Step 3: Deploy Backend

After committing, deploy the backend:
1. Create Pull Request on GitHub
2. Merge to main/develop
3. Deploy to production (Google Cloud Run)

## Step 4: Test on iOS Simulator

Once backend is deployed:

1. **Start Metro bundler:**
   ```bash
   cd /Users/aghone01/Documents/CS/OneCrewApp
   npx expo start --clear
   ```

2. **Run on iOS simulator:**
   ```bash
   npx expo run:ios
   ```

3. **Test Steps:**
   - Login with: `ghoneem77@gmail.com` / `password123`
   - Navigate to Messages tab
   - Check terminal logs for Stream Chat initialization
   - Try to create a conversation
   - Send a test message

## Step 5: Verify Logs

Watch for these logs in terminal:

**Success logs:**
```
💬 [StreamChatProvider] Initializing StreamChat...
💬 Getting StreamChat token...
✅ StreamChat token retrieved successfully
💬 [StreamChatProvider] Token response: { success: true, hasData: true, hasToken: true, hasUserId: true, hasApiKey: true }
💬 [StreamChatProvider] Connecting user...
✅ StreamChat: User connected successfully
✅ [StreamChatProvider] Client already connected
```

**Error logs (if still issues):**
```
❌ Failed to get StreamChat token: ...
❌ [StreamChatProvider] Failed to initialize: ...
```

## Troubleshooting

### If endpoint still returns 404:
- Backend not deployed yet
- Wait for deployment to complete

### If endpoint returns wrong user_id format:
- Backend fix not deployed yet
- Verify the fix is in the deployed code

### If frontend still can't connect:
- Check terminal logs for specific errors
- Verify API key is being returned
- Check user_id format matches expected format

