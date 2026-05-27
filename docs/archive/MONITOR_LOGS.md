# Monitor Logs - Stream Chat Testing

## Configuration
- **Backend URL:** `http://172.23.179.222:3000`
- **Mac IP:** `172.23.179.222`
- **Backend Port:** `3000`

## What to Watch For

### ✅ Success Logs (What You Want to See)

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

### ❌ Error Logs (What to Fix)

#### Backend Connection Error
```
❌ Failed to get StreamChat token: Network request failed
❌ Failed to get StreamChat token: connect ECONNREFUSED
```
**Fix:** Check backend is running on `172.23.179.222:3000`

#### Endpoint Not Found
```
❌ HTTP Error: 404 {"error": "Route /api/chat/token not found"}
```
**Fix:** Backend fix not deployed, check backend code

#### Token Format Error
```
❌ [StreamChatProvider] Token response failed
```
**Fix:** Check backend returns correct format

#### User ID Format Error
```
⚠️ User ID format issue: dda3aaa6-d123... (should start with 'onecrew_')
```
**Fix:** Backend fix not applied correctly

## How to Monitor

### Metro Bundler Logs
Watch the terminal where Metro is running for:
- Stream Chat initialization messages
- API calls to `/api/chat/token`
- Connection status

### Backend Logs
```bash
tail -f /tmp/onecrew-backend.log
```

Look for:
- `POST /api/chat/token` requests
- Token generation
- User ID formatting

### iOS Simulator
- Check app behavior
- Messages tab should load (not stuck on "Connecting...")
- Can create conversations
- Can send messages

## Test Steps

1. **Login:**
   - Email: `ghoneem77@gmail.com`
   - Password: `password123`

2. **Navigate to Messages:**
   - Tap Messages tab
   - Should NOT see "Connecting to chat..." stuck

3. **Check Terminal:**
   - Look for success logs above
   - No error messages

4. **Test Chat:**
   - Create new conversation
   - Send a message
   - Verify it appears

## Troubleshooting

### If "Connecting to chat..." is stuck:
1. Check Metro logs for errors
2. Verify backend is accessible: `curl http://172.23.179.222:3000/api/health`
3. Check backend logs for requests

### If endpoint returns 404:
1. Verify backend code has the fix
2. Check backend is running latest code
3. Restart backend server

### If connection refused:
1. Verify backend is running: `lsof -i :3000`
2. Check firewall settings
3. Verify IP address is correct

