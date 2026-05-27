# Backend Token Endpoint Issue

## Problem

The backend `/api/chat/token` endpoint is not reading query parameters for profile switching. It always returns a user token (`onecrew_user_...`) even when `profile_type=company&company_id=...` is provided.

## Test Results

### Test 1: User Profile (Default) ✅
```bash
curl -X POST "https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app/api/chat/token" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "...",
    "user_id": "onecrew_user_06851aee-9f94-4673-94c5-f1f436f979c3",
    "api_key": "j8yy2mzarh3n"
  }
}
```
✅ **Correct** - Returns user token

### Test 2: Company Profile (Query Params) ❌
```bash
curl -X POST "https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app/api/chat/token?profile_type=company&company_id=fe045b7c-b310-4295-87e1-d5ceca66e55d" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "...",
    "user_id": "onecrew_user_06851aee-9f94-4673-94c5-f1f436f979c3",  // ❌ WRONG - Should be company
    "api_key": "j8yy2mzarh3n"
  }
}
```
❌ **Incorrect** - Still returns user token instead of `onecrew_company_fe045b7c-b310-4295-87e1-d5ceca66e55d`

## Expected Behavior

When `profile_type=company&company_id={id}` is provided:
- Should verify user is a member of the company
- Should return: `onecrew_company_{companyId}`
- Should generate token for the company identity

## Backend Fix Required

The backend token endpoint needs to:

1. **Read query parameters** from the request:
   ```typescript
   const profileType = req.query.profile_type || 'user';
   const companyId = req.query.company_id;
   ```

2. **Verify company membership** (if company profile):
   ```typescript
   if (profileType === 'company' && companyId) {
     // Verify user is a member of the company
     const isMember = await verifyCompanyMembership(userId, companyId);
     if (!isMember) {
       return res.status(403).json({ error: 'Not a member of this company' });
     }
   }
   ```

3. **Return correct user ID format**:
   ```typescript
   const streamUserId = profileType === 'company' && companyId
     ? `onecrew_company_${companyId}`
     : `onecrew_user_${userId}`;
   ```

## Frontend Status

✅ **Frontend is ready** - Already updated to:
- Use POST method
- Pass query parameters: `?profile_type=company&company_id={id}`
- Handle company profile tokens correctly

## Next Steps

1. **Verify backend deployment** - Check if the fix is deployed to staging
2. **Test backend endpoint** - Use the test script to verify it works
3. **Deploy fix** - If not deployed, deploy the backend fix to staging
4. **Test end-to-end** - Test profile switching in the app

## Test Script

Run the test script to verify:
```bash
./test-token-direct.sh
```

Or manually test:
```bash
TOKEN="your_jwt_token"
COMPANY_ID="fe045b7c-b310-4295-87e1-d5ceca66e55d"

# Test company token
curl -X POST "https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app/api/chat/token?profile_type=company&company_id=${COMPANY_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  | jq '.data.user_id'
```

Expected output: `"onecrew_company_fe045b7c-b310-4295-87e1-d5ceca66e55d"`

