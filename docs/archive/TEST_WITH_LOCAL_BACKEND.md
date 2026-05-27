# Test with Local Backend

## Backend Status
✅ **Backend running on:** `http://localhost:3000`  
✅ **Process ID:** 18351  
✅ **Logs:** `tail -f /tmp/onecrew-backend.log`

## Step 1: Test Endpoint (Terminal)

Run this command to test the endpoint:

```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
chmod +x test-local-backend.sh
./test-local-backend.sh
```

Or manually:
```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"ghoneem77@gmail.com","password":"password123"}' \
  | jq -r '.data.token')

# Test endpoint
curl -X POST http://localhost:3000/api/chat/token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "onecrew_user_dda3aaa6-d123-4e57-aeef-f0661ec61352",
    "token": "eyJ...",
    "api_key": "gjs4e7pmvpum"
  }
}
```

## Step 2: Update Frontend to Use Local Backend

**File:** `src/contexts/ApiContext.tsx`

**Change line 446-448:**
```typescript
// FROM:
baseUrl = 'https://onecrew-backend-309236356616.us-central1.run.app' // Production server

// TO:
baseUrl = 'http://localhost:3000' // Local server
```

Or uncomment line 448:
```typescript
baseUrl = 'http://localhost:3000' // Local server
```

## Step 3: Start iOS Simulator

```bash
# Terminal 1: Start Metro
cd /Users/aghone01/Documents/CS/OneCrewApp
npx expo start --clear

# Terminal 2: Run iOS (or press 'i' in Metro)
npx expo run:ios
```

## Step 4: Test in Simulator

1. **Login:**
   - Email: `ghoneem77@gmail.com`
   - Password: `password123`

2. **Navigate to Messages:**
   - Tap Messages tab
   - Watch terminal logs

3. **Check Logs:**
   Look for:
   ```
   💬 [StreamChatProvider] Initializing StreamChat...
   ✅ StreamChat token retrieved successfully
   ✅ StreamChat: User connected successfully
   ```

4. **Test Chat:**
   - Create conversation
   - Send message
   - Verify it works

## Important Notes

⚠️ **iOS Simulator Limitation:**
- iOS Simulator cannot access `localhost:3000` directly
- You need to use your Mac's IP address instead

**Solution:** Use your Mac's local IP:
```typescript
// Find your Mac's IP:
// System Preferences → Network → Wi-Fi → IP Address
// Or run: ipconfig getifaddr en0

baseUrl = 'http://192.168.1.XXX:3000' // Replace XXX with your IP
```

**Or use ngrok (recommended for testing):**
```bash
# Install ngrok: brew install ngrok
# Then run:
ngrok http 3000

# Use the ngrok URL in frontend:
baseUrl = 'https://xxxx-xx-xx-xx-xx.ngrok.io'
```

## Quick Test Checklist

- [ ] Backend running on localhost:3000
- [ ] Endpoint test passes (returns formatted user_id)
- [ ] Frontend baseUrl updated to localhost
- [ ] Metro bundler started
- [ ] iOS simulator running
- [ ] Login successful
- [ ] Stream Chat connects
- [ ] Can send/receive messages

