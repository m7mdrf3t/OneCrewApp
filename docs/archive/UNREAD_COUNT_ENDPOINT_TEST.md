# Unread Count Endpoint - Test Guide

## Quick Test

Run the test script:

```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
./test-unread-count-endpoint.sh
```

## Monitor Endpoint Continuously

Monitor the endpoint to test cache behavior and performance:

```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
./monitor-unread-count.sh
```

Press `Ctrl+C` to stop monitoring.

## Manual Testing

### 1. Get Authentication Token

```bash
# Set your credentials
export EMAIL="your-email@example.com"
export PASSWORD="your-password"

# Login
TOKEN=$(curl -s -X POST "https://onecrew-backend-staging-309236356616.us-central1.run.app/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" \
  | jq -r '.data.token')

echo "Token: $TOKEN"
```

### 2. Test User Profile Unread Count

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

**If cached:**
```json
{
  "success": true,
  "data": {
    "unread_count": 1,
    "profile_type": "user",
    "profile_id": "user-uuid",
    "cached": true
  }
}
```

### 3. Test Company Profile Unread Count

```bash
# Replace COMPANY_ID with actual company ID
COMPANY_ID="your-company-id"

curl -X GET "https://onecrew-backend-staging-309236356616.us-central1.run.app/api/chat/conversations/unread-count?profile_type=company&company_id=${COMPANY_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  | jq .
```

### 4. Test Error Cases

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

## Performance Testing

### Test Response Time

```bash
# Test multiple times and measure average
for i in {1..10}; do
  time curl -s -X GET "https://onecrew-backend-staging-309236356616.us-central1.run.app/api/chat/conversations/unread-count?profile_type=user" \
    -H "Authorization: Bearer ${TOKEN}" > /dev/null
done
```

### Test Cache Behavior

1. **First request** (cache miss):
   - Should take 50-200ms
   - Response should NOT have `"cached": true`

2. **Second request** (cache hit):
   - Should take < 50ms
   - Response should have `"cached": true`

3. **After cache expiry** (10 seconds):
   - Should refresh cache
   - Response should NOT have `"cached": true`

## Monitoring Checklist

- [ ] Endpoint is accessible
- [ ] Authentication works
- [ ] User profile returns correct count
- [ ] Company profile returns correct count
- [ ] Error handling works (400 for invalid requests)
- [ ] Response time is fast (< 200ms)
- [ ] Cache works (second request is faster)
- [ ] Cache expires after 10 seconds
- [ ] Rate limiting works (100 requests per 15 minutes)

## Expected Performance

- **First request (cache miss):** 50-200ms
- **Cached request:** < 50ms
- **Response size:** ~100 bytes
- **Cache TTL:** 10 seconds

## Troubleshooting

### Endpoint returns 404

Check if endpoint is deployed:
```bash
curl -X GET "https://onecrew-backend-staging-309236356616.us-central1.run.app/api/chat/conversations/unread-count?profile_type=user" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Endpoint returns 401

Check if token is valid:
```bash
# Verify token
curl -X GET "https://onecrew-backend-staging-309236356616.us-central1.run.app/api/users/me" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Endpoint returns 429 (Rate Limited)

Wait 15 minutes or check rate limiter configuration.

### Count is always 0

1. Check if user has unread conversations
2. Verify profile_type matches actual profile
3. Check backend logs for errors
4. Verify Stream Chat integration is working

---

**Date:** January 28, 2026
**Status:** Ready for testing
