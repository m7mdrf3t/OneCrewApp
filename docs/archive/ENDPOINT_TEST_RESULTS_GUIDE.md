# Endpoint Test Results Guide

## Commands to Run

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

## Expected Response (After Deployment)

### ✅ Success Response
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

**What to Check:**
- ✅ `success: true`
- ✅ `data.user_id` starts with `onecrew_user_` or `onecrew_company_`
- ✅ `data.token` is present (JWT string starting with `eyJ`)
- ✅ `data.api_key` is present

### ❌ Error Responses

#### 404 Not Found
```json
{
  "success": false,
  "error": "Route /api/chat/token not found"
}
```
**Meaning:** Backend fix not deployed yet. Wait for deployment.

#### 500 Server Error
```json
{
  "success": false,
  "error": "StreamChat API key not configured..."
}
```
**Meaning:** Backend environment variables not set. Check backend `.env` file.

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized"
}
```
**Meaning:** JWT token expired or invalid. Re-run login command.

## Validation Checklist

After running the test, verify:

- [ ] HTTP Status: 200 OK
- [ ] `success: true` in response
- [ ] `data.user_id` format: `onecrew_user_{uuid}` or `onecrew_company_{uuid}`
- [ ] `data.token` is a valid JWT (starts with `eyJ`)
- [ ] `data.api_key` equals `gjs4e7pmvpum`

## What the Response Means

### If `user_id` is formatted correctly:
✅ Backend fix is deployed and working!
- You can proceed to test on iOS simulator
- Frontend should be able to connect to Stream Chat

### If `user_id` is NOT formatted (e.g., just the UUID):
⚠️ Backend fix not deployed yet
- Wait for PR merge and deployment
- Or test against local backend if running locally

### If endpoint returns 404:
❌ Backend fix not deployed
- Check if PR was merged
- Verify deployment status
- Check backend logs

## Next Steps Based on Results

### ✅ If Test Passes:
1. Start Metro: `npx expo start --clear`
2. Run iOS: `npx expo run:ios`
3. Test in simulator (login and navigate to Messages)
4. Verify Stream Chat connects

### ❌ If Test Fails:
1. Check error message
2. Verify backend deployment status
3. Check backend logs
4. Wait for deployment if needed

## Troubleshooting

### Command not found: jq
Install jq:
```bash
# macOS
brew install jq

# Or use without jq (less readable)
curl -X POST ... | python3 -m json.tool
```

### Network errors
- Check internet connection
- Verify backend URL is correct
- Check if backend is running

### Token expired
- Re-run the login command to get a fresh token
- Tokens typically expire after some time

