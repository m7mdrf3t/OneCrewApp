# Quick Test - Copy & Paste These Commands

## Step 1: Get Token and Test Endpoint

Copy and paste this entire block into your terminal:

```bash
TOKEN=$(curl -s -X POST https://onecrew-backend-309236356616.us-central1.run.app/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"ghoneem77@gmail.com","password":"password123"}' \
  | jq -r '.data.token') && \
curl -X POST https://onecrew-backend-309236356616.us-central1.run.app/api/chat/token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq .
```

## Step 2: Check the Response

### ✅ Good Response:
```json
{
  "success": true,
  "data": {
    "user_id": "onecrew_user_...",  ← Should start with "onecrew_user_"
    "token": "eyJ...",
    "api_key": "gjs4e7pmvpum"
  }
}
```

### ❌ Bad Response:
```json
{
  "success": false,
  "error": "Route /api/chat/token not found"
}
```
← This means backend not deployed yet

## Step 3: If Test Passes, Start Simulator

```bash
# Terminal 1
cd /Users/aghone01/Documents/CS/OneCrewApp
npx expo start --clear

# Terminal 2 (or press 'i' in Metro)
npx expo run:ios
```

## Step 4: Test in App

1. Login: `ghoneem77@gmail.com` / `password123`
2. Go to Messages tab
3. Should NOT see "Connecting to chat..." stuck
4. Should see conversations list (or empty if no conversations)

