# Backend Unread Count Endpoint - Test Guide

## Test Scripts Created

### 1. **`test-backend-quick.sh`** - Quick Verification
Simple test that verifies the endpoint is working.

```bash
./test-backend-quick.sh
```

**What it tests:**
- Authentication
- Unread count endpoint (user profile)
- Response structure

### 2. **`test-backend-unread-count.sh`** - Comprehensive Test
Full test suite with all test cases.

```bash
./test-backend-unread-count.sh
```

**What it tests:**
- ✅ Authentication
- ✅ User profile unread count
- ✅ Cache behavior (second request)
- ✅ Company profile unread count (if available)
- ✅ Error handling:
  - Missing `profile_type`
  - Invalid `profile_type`
  - Company profile without `company_id`
  - Invalid token

### 3. **`test-backend-retry.sh`** - Retry Until Success
Keeps testing until backend is available.

```bash
./test-backend-retry.sh
```

**Features:**
- Retries up to 10 times (configurable)
- 5 second delay between retries (configurable)
- Shows progress for each attempt
- Exits on success

**Configuration:**
```bash
MAX_RETRIES=20 RETRY_DELAY=3 ./test-backend-retry.sh
```

## Manual Testing

### Step 1: Get Authentication Token

```bash
TOKEN=$(curl -s -X POST "https://onecrew-backend-staging-309236356616.us-central1.run.app/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{"email":"ghoneem77@gmail.com","password":"password123"}' \
  | jq -r '.data.token')

echo "Token: $TOKEN"
```

### Step 2: Test User Profile Unread Count

```bash
curl -X GET "https://onecrew-backend-staging-309236356616.us-central1.run.app/api/chat/conversations/unread-count?profile_type=user" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "unread_count": 1,
    "profile_type": "user",
    "profile_id": "user-uuid"
  }
}
```

### Step 3: Test Company Profile Unread Count

```bash
# Replace COMPANY_ID with actual company ID
COMPANY_ID="your-company-id"

curl -X GET "https://onecrew-backend-staging-309236356616.us-central1.run.app/api/chat/conversations/unread-count?profile_type=company&company_id=${COMPANY_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  | jq .
```

### Step 4: Test Cache Behavior

```bash
# First request (cache miss)
time curl -s -X GET "https://onecrew-backend-staging-309236356616.us-central1.run.app/api/chat/conversations/unread-count?profile_type=user" \
  -H "Authorization: Bearer ${TOKEN}" \
  | jq .

# Second request (should be cached)
time curl -s -X GET "https://onecrew-backend-staging-309236356616.us-central1.run.app/api/chat/conversations/unread-count?profile_type=user" \
  -H "Authorization: Bearer ${TOKEN}" \
  | jq .
```

**Expected:**
- First request: `"cached": false` or no cached field
- Second request: `"cached": true`
- Second request should be faster

### Step 5: Test Error Cases

**Missing profile_type:**
```bash
curl -X GET "https://onecrew-backend-staging-309236356616.us-central1.run.app/api/chat/conversations/unread-count" \
  -H "Authorization: Bearer ${TOKEN}" \
  | jq .
# Expected: 400 Bad Request
```

**Invalid profile_type:**
```bash
curl -X GET "https://onecrew-backend-staging-309236356616.us-central1.run.app/api/chat/conversations/unread-count?profile_type=invalid" \
  -H "Authorization: Bearer ${TOKEN}" \
  | jq .
# Expected: 400 Bad Request
```

**Company profile without company_id:**
```bash
curl -X GET "https://onecrew-backend-staging-309236356616.us-central1.run.app/api/chat/conversations/unread-count?profile_type=company" \
  -H "Authorization: Bearer ${TOKEN}" \
  | jq .
# Expected: 400 Bad Request
```

**Invalid token:**
```bash
curl -X GET "https://onecrew-backend-staging-309236356616.us-central1.run.app/api/chat/conversations/unread-count?profile_type=user" \
  -H "Authorization: Bearer invalid_token" \
  | jq .
# Expected: 401 Unauthorized or 403 Forbidden
```

## Expected Results

### ✅ Success Criteria

1. **Authentication:** Returns valid token
2. **User Profile:** Returns `200 OK` with unread count
3. **Company Profile:** Returns `200 OK` with unread count (if company exists)
4. **Cache:** Second request shows `"cached": true` and is faster
5. **Error Handling:** All error cases return appropriate status codes

### 📊 Performance Expectations

- **First Request (Cache Miss):** 50-200ms
- **Cached Request:** < 50ms
- **Response Size:** ~100 bytes
- **Cache TTL:** 10 seconds

## Troubleshooting

### Backend Not Responding

If backend is not responding:

1. **Check if backend is running:**
   ```bash
   curl -I https://onecrew-backend-staging-309236356616.us-central1.run.app/api/health
   ```

2. **Check DNS resolution:**
   ```bash
   nslookup onecrew-backend-staging-309236356616.us-central1.run.app
   ```

3. **Check network connectivity:**
   ```bash
   ping -c 3 onecrew-backend-staging-309236356616.us-central1.run.app
   ```

### Endpoint Returns 404

- Verify endpoint path: `/api/chat/conversations/unread-count`
- Check if endpoint is deployed
- Verify route is registered before `/api/chat/conversations`

### Endpoint Returns 500

- Check backend logs
- Verify Stream Chat integration
- Check Redis connection (for caching)

### Count Always Returns 0

- Verify user has unread conversations
- Check Stream Chat member state
- Verify profile_type matches actual profile
- Check backend logs for errors

## Continuous Monitoring

To continuously monitor the endpoint:

```bash
# Monitor every 5 seconds
watch -n 5 './test-backend-quick.sh'

# Or use the continuous test script
./test-unread-continuous.sh
```

## Test Results Format

When tests pass, you should see:

```
✅ All tests passed! Backend endpoint is working correctly.
```

When tests fail, review:
- HTTP status codes
- Response bodies
- Error messages
- Network connectivity

---

**Date:** January 28, 2026
**Status:** Ready for testing
