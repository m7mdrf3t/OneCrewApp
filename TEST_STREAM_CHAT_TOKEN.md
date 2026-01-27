# StreamChat Token Endpoint Test

## Problem

When switching to a company profile, the StreamChat client is still connected as the user (`onecrew_user_...`) instead of the company (`onecrew_company_...`). This causes permission errors when trying to read channels created from the company profile.

## Root Cause

The backend `/api/chat/token` endpoint likely doesn't know about the current profile type. It always returns a user token, even when the frontend is on a company profile.

## Test Script

Run the test script to verify the backend behavior:

```bash
# Basic test (user profile)
./test-stream-chat-token.sh

# Test with company profile
COMPANY_ID="fe045b7c-b310-4295-87e1-d5ceca66e55d" ./test-stream-chat-token.sh

# Custom credentials
EMAIL="your@email.com" PASSWORD="your_password" ./test-stream-chat-token.sh
```

## Expected Results

### User Profile (Default)
- Should return: `onecrew_user_{userId}`
- Example: `onecrew_user_06851aee-9f94-4673-94c5-f1f436f979c3`

### Company Profile
- Should return: `onecrew_company_{companyId}`
- Example: `onecrew_company_fe045b7c-b310-4295-87e1-d5ceca66e55d`

## Backend Requirements

The backend token endpoint needs to:

1. **Accept profile type context** - Either via:
   - Query parameter: `?company_id={id}` or `?profile_type=company`
   - Header: `X-Company-Id: {id}` or `X-Profile-Type: company`
   - Request body: `{"company_id": "{id}"}` or `{"profile_type": "company"}`

2. **Return correct user ID format**:
   - User profile: `onecrew_user_{userId}`
   - Company profile: `onecrew_company_{companyId}`

3. **Generate token for the correct identity**:
   - The token should be generated for the StreamChat user ID that matches the profile type

## Current Issue

Based on the logs:
- Frontend is on company profile: `currentProfileType: "company"`
- Active company ID: `fe045b7c-b310-4295-87e1-d5ceca66e55d`
- But StreamChat is connected as: `onecrew_user_06851aee-9f94-4673-94c5-f1f436f979c3` (WRONG)
- Should be: `onecrew_company_fe045b7c-b310-4295-87e1-d5ceca66e55d`

## Frontend Fix (Already Applied)

The `StreamChatProvider` has been updated to:
- Always check if the connected user ID matches the expected ID for the current profile
- Reconnect if there's a mismatch
- But this only works if the backend returns the correct user ID

## Next Steps

1. **Test the backend endpoint** using the test script
2. **Verify if backend supports company profile tokens**
3. **If not, update backend** to accept profile type context
4. **Update frontend API client** to send profile type when requesting tokens

## Manual Test with curl

```bash
# 1. Login
TOKEN=$(curl -s -X POST "https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{"email":"m7mdrf3t0@gmail.com","password":"your_password"}' \
  | jq -r '.data.token')

# 2. Get user token
curl -X GET "https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app/api/chat/token" \
  -H "Authorization: Bearer $TOKEN" \
  | jq .

# 3. Try to get company token (test different methods)
# Method 1: Query parameter
curl -X GET "https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app/api/chat/token?company_id=fe045b7c-b310-4295-87e1-d5ceca66e55d" \
  -H "Authorization: Bearer $TOKEN" \
  | jq .

# Method 2: Header
curl -X GET "https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app/api/chat/token" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Company-Id: fe045b7c-b310-4295-87e1-d5ceca66e55d" \
  | jq .

# Method 3: POST with body
curl -X POST "https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app/api/chat/token" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"fe045b7c-b310-4295-87e1-d5ceca66e55d"}' \
  | jq .
```

