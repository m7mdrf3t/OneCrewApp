# Local Backend Testing Guide

## Step 1: Start Backend Server

In your backend repository (`OneCrewBE`):

```bash
cd /path/to/OneCrewBE
npm run dev
```

The backend should start on `http://localhost:3000` (or check your backend's port configuration).

## Step 2: Test with curl

### Quick Test (Guest User - No Auth)

```bash
curl -s -X GET "http://localhost:3000/api/companies?subcategory=academy&limit=100" \
  -H "Content-Type: application/json" | jq '.data[0:3] | .[] | {id, name, visibility}'
```

**Expected:** Only academies with `visibility: "published"` or `visibility: null` (no private ones)

### Count Private Academies (Guest)

```bash
curl -s -X GET "http://localhost:3000/api/companies?subcategory=academy&limit=100" \
  -H "Content-Type: application/json" | jq '[.data[]? | select(.visibility == "private")] | length'
```

**Expected:** `0` (no private academies for guest users)

### Full Response Check

```bash
curl -s -X GET "http://localhost:3000/api/companies?subcategory=academy&limit=100" \
  -H "Content-Type: application/json" | jq '.'
```

### Test with Authenticated User

Replace `YOUR_JWT_TOKEN` with a token from your app:

```bash
curl -s -X GET "http://localhost:3000/api/companies?subcategory=academy&limit=100" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq '[.data[]? | select(.visibility == "private")] | length'
```

## Step 3: Use the Test Script

Run the automated test script:

```bash
# From the frontend directory
./test-academy-visibility-local.sh

# Or specify a different port
BASE_URL="http://localhost:3001" ./test-academy-visibility-local.sh
```

## Verification Checklist

- [ ] Backend server is running on localhost
- [ ] Guest user (no token) sees **0 private academies**
- [ ] Regular user sees **0 private academies** (unless they own/manage some)
- [ ] Academy owner sees **their own private academies** + all published
- [ ] All users see **all published academies**

## Getting JWT Token for Testing

1. Open your React Native app
2. Log in as different users (regular user, academy owner)
3. Check console logs or network inspector for the Authorization header
4. Copy the JWT token and use it in the curl commands

## Troubleshooting

### Backend not responding
- Check the backend is running: `curl http://localhost:3000/health` (or your health endpoint)
- Verify the port matches your backend configuration

### Still seeing private academies for guest users
- Check backend logs to see if Supabase function is being called
- Verify `p_current_user_id` parameter is `NULL` for guest requests
- Check Supabase function is correctly filtering

### No academies returned
- Check if there are any academies in the database
- Verify `subcategory=academy` filter is working
- Check backend logs for errors

