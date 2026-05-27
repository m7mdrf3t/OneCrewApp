# Start Testing - Manual Commands

## Terminal Issue
The automated commands aren't working. Please run these manually:

## Step 1: Test Endpoint (Optional - to verify backend is deployed)

Open a terminal and run:

```bash
# Get JWT token
TOKEN=$(curl -s -X POST https://onecrew-backend-309236356616.us-central1.run.app/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"ghoneem77@gmail.com","password":"password123"}' \
  | jq -r '.data.token')

# Test chat endpoint
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

## Step 2: Start Metro Bundler

In Terminal 1:
```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
npx expo start --clear
```

Wait for Metro to show:
```
Metro waiting on http://localhost:8081
```

## Step 3: Run iOS Simulator

In Terminal 2 (or press `i` in Metro terminal):
```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
npx expo run:ios
```

Or if Metro is already running, just press `i` in the Metro terminal.

## Step 4: Test in Simulator

1. **Login:**
   - Email: `ghoneem77@gmail.com`
   - Password: `password123`

2. **Navigate to Messages:**
   - Tap on "Messages" tab
   - Watch terminal logs

3. **Check Terminal Logs:**
   Look for:
   ```
   💬 [StreamChatProvider] Initializing StreamChat...
   ✅ StreamChat token retrieved successfully
   ✅ StreamChat: User connected successfully
   ```

4. **Test Chat:**
   - Create new conversation
   - Send a message
   - Verify it appears

## Troubleshooting

### If endpoint returns 404:
- Backend not deployed yet
- Wait for deployment or check if PR was merged

### If "Connecting to chat..." stuck:
- Check terminal for errors
- Verify endpoint test passes
- Check network connection

### If terminal commands fail:
- Make sure you're in the correct directory
- Check if Node.js and Expo CLI are installed
- Try running commands one at a time

