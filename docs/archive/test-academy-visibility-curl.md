# Academy Visibility Filtering - curl Test Commands

## Base URL
```
Staging: https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app
Production: https://onecrew-backend-309236356616.us-central1.run.app
```

## Test Scenarios

### Test 1: Guest User (No Authentication)
**Expected Result:** Only published academies should be returned (visibility='published' or NULL)

```bash
curl -X GET "https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app/api/companies?subcategory=academy&limit=100&fields=id,name,visibility,owner" \
  -H "Content-Type: application/json"
```

**Verify:**
- Check that all returned academies have `visibility: "published"` or `visibility: null`
- No academies with `visibility: "private"` should appear

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Published Academy 1",
      "visibility": "published",
      "owner": { ... }
    },
    {
      "id": "...",
      "name": "Published Academy 2",
      "visibility": null,
      "owner": { ... }
    }
  ]
}
```

---

### Test 2: Regular Authenticated User (Not Owner/Admin)
**Expected Result:** Only published academies (not private ones unless user is owner/admin)

**Replace `YOUR_JWT_TOKEN` with a token from a regular user account:**

```bash
curl -X GET "https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app/api/companies?subcategory=academy&limit=100&fields=id,name,visibility,owner" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Verify:**
- All returned academies should be published OR
- If any private academies appear, verify the user is the owner or admin of those academies

---

### Test 3: Academy Owner
**Expected Result:** All published academies + their own private academies

**Replace `OWNER_JWT_TOKEN` with a token from an academy owner account:**

```bash
curl -X GET "https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app/api/companies?subcategory=academy&limit=100&fields=id,name,visibility,owner" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer OWNER_JWT_TOKEN"
```

**Verify:**
- User should see all published academies
- User should see their own private academies
- User should NOT see other users' private academies

---

### Test 4: Academy Admin
**Expected Result:** All published academies + private academies they manage

**Replace `ADMIN_JWT_TOKEN` with a token from an academy admin account:**

```bash
curl -X GET "https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app/api/companies?subcategory=academy&limit=100&fields=id,name,visibility,owner" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

**Verify:**
- User should see all published academies
- User should see private academies where they have admin role
- User should NOT see private academies where they are not admin/owner

---

## Quick Verification Commands

### Count Private vs Published (Guest)
```bash
curl -s -X GET "https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app/api/companies?subcategory=academy&limit=100&fields=id,name,visibility" \
  -H "Content-Type: application/json" | jq '[.data[]? | select(.visibility == "private")] | length'
```

**Expected:** `0` (no private academies for guest)

### Count Private vs Published (Authenticated)
```bash
curl -s -X GET "https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app/api/companies?subcategory=academy&limit=100&fields=id,name,visibility" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq '[.data[]? | select(.visibility == "private")] | length'
```

**Expected:** Only private academies owned/managed by the authenticated user

---

## Using the Test Script

Make the script executable:
```bash
chmod +x test-academy-visibility.sh
```

Run with different user tokens:
```bash
# Guest user (no token needed)
./test-academy-visibility.sh

# With regular user token
REGULAR_USER_TOKEN="your_token" ./test-academy-visibility.sh

# With owner token
OWNER_TOKEN="owner_token" ./test-academy-visibility.sh

# With both
REGULAR_USER_TOKEN="regular_token" OWNER_TOKEN="owner_token" ./test-academy-visibility.sh
```

---

## Getting JWT Tokens

### From App Logs
1. Open the React Native app
2. Log in as different users (regular user, academy owner, academy admin)
3. Check console logs for JWT tokens
4. Or use the app's network inspector to capture Authorization headers

### From Backend
If you have backend access, you can generate test tokens or check the database for user tokens.

---

## Troubleshooting

### Issue: Private academies visible to guest users
**Check:**
1. Backend is calling the Supabase function correctly
2. Function parameter `p_current_user_id` is `NULL` for guest users
3. Function visibility logic is correct

### Issue: Private academies not visible to owners
**Check:**
1. User ID from JWT token is being passed correctly to the function
2. `owner_id` in companies table matches the user ID
3. Company members table has correct role entries

### Issue: Private academies visible to non-admin users
**Check:**
1. Company members table has correct `role` values ('owner', 'admin')
2. `invitation_status` is 'accepted'
3. `deleted_at` is NULL for active memberships

