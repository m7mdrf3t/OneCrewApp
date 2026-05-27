# Quick Test Guide: Academy Visibility Filtering

## ✅ Frontend Changes Completed

1. **Removed client-side filtering** from `DirectoryPage.tsx` - Backend now handles all visibility filtering
2. **Updated cache key** in `ApiContext.tsx` to include user context for proper cache invalidation
3. **Added development warning** to detect if backend filtering isn't working correctly

## 🧪 Testing with curl

### Quick Test (Guest User - No Auth)

This should return **ONLY published academies** (no private ones):

```bash
curl -X GET "https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app/api/companies?subcategory=academy&limit=100&fields=id,name,visibility,owner" \
  -H "Content-Type: application/json" | jq '.data[] | select(.visibility == "private")'
```

**Expected Result:** Empty array `[]` (no private academies)

### Count Private Academies (Guest)

```bash
curl -s -X GET "https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app/api/companies?subcategory=academy&limit=100&fields=id,name,visibility" \
  -H "Content-Type: application/json" | jq '[.data[]? | select(.visibility == "private")] | length'
```

**Expected:** `0`

### Test with Authenticated User

Replace `YOUR_JWT_TOKEN` with a token from a regular user (not owner/admin):

```bash
curl -X GET "https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app/api/companies?subcategory=academy&limit=100&fields=id,name,visibility,owner" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq '.data[] | select(.visibility == "private")'
```

**Expected:** Only private academies where the user is owner or admin

### Full Response (Pretty Print)

```bash
curl -s -X GET "https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app/api/companies?subcategory=academy&limit=100&fields=id,name,visibility,owner" \
  -H "Content-Type: application/json" | jq '.'
```

## 🔍 Verification Checklist

- [ ] Guest user (no token) sees **0 private academies**
- [ ] Regular user sees **0 private academies** (unless they own/manage some)
- [ ] Academy owner sees **their own private academies** + all published
- [ ] Academy admin sees **private academies they manage** + all published
- [ ] All users see **all published academies**

## 🐛 Troubleshooting

### If private academies appear for guest users:

1. Check backend is calling Supabase function correctly
2. Verify function parameter `p_current_user_id` is `NULL` for guest requests
3. Check Supabase function logs

### If private academies don't appear for owners:

1. Verify JWT token contains correct user ID
2. Check `owner_id` in companies table matches user ID
3. Verify company members table has correct role entries

## 📝 Using the Test Script

Run the automated test script:

```bash
# Guest user test (no token needed)
./test-academy-visibility.sh

# With user tokens
REGULAR_USER_TOKEN="your_token" OWNER_TOKEN="owner_token" ./test-academy-visibility.sh
```

## 📚 Full Documentation

See `test-academy-visibility-curl.md` for detailed test scenarios and examples.

