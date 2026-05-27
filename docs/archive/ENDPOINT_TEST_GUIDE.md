# Stream Chat Token Endpoint - Testing Guide

## Quick Test Commands

Run these commands in your terminal to test the endpoint:

### Option 1: Use Enhanced Test Script

```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
chmod +x ENHANCED_TEST_SCRIPT.sh
./ENHANCED_TEST_SCRIPT.sh
```

### Option 2: Manual Test Commands

```bash
# Step 1: Login and get JWT token
TOKEN=$(curl -s -X POST https://onecrew-backend-309236356616.us-central1.run.app/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"ghoneem77@gmail.com","password":"password123"}' \
  | jq -r '.data.token')

echo "Token: ${TOKEN:0:50}..."

# Step 2: Test chat token endpoint
curl -X POST https://onecrew-backend-309236356616.us-central1.run.app/api/chat/token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  | jq .

# Step 3: Validate response
RESPONSE=$(curl -s -X POST https://onecrew-backend-309236356616.us-central1.run.app/api/chat/token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo ""
echo "Validation:"
echo "  Success: $(echo $RESPONSE | jq -r '.success')"
echo "  User ID: $(echo $RESPONSE | jq -r '.data.user_id')"
echo "  Has Token: $(echo $RESPONSE | jq -r '.data.token != null')"
echo "  API Key: $(echo $RESPONSE | jq -r '.data.api_key')"
```

## Expected Response

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

## Validation Checklist

After running the test, verify:

- [ ] HTTP Status: 200 OK
- [ ] `success: true`
- [ ] `data.token` exists and starts with `eyJ` (JWT format)
- [ ] `data.user_id` exists and starts with `onecrew_`
- [ ] `data.user_id` format: `onecrew_user_{uuid}` (for regular users)
- [ ] `data.api_key` exists and equals `gjs4e7pmvpum`

## Troubleshooting

### If endpoint returns 404:
- Backend fix not deployed yet
- Wait for deployment or check if PR was merged

### If user_id format is wrong:
- Backend fix not deployed
- Verify the fix is in the deployed code

### If token is missing:
- Check backend logs
- Verify Stream Chat SDK is installed
- Check environment variables

## Next: Test on iOS Simulator

After endpoint test passes, test on simulator:
1. Start Metro: `npx expo start --clear`
2. Run iOS: `npx expo run:ios`
3. Login and navigate to Messages
4. Check terminal logs for Stream Chat initialization

