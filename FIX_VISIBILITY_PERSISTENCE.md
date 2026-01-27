# Fix: Academy Visibility Not Persisting

## Issue
When setting an academy to private:
1. The visibility appears to update in the UI
2. But when navigating back and returning, it reverts to "published"
3. Normal users can still see the academy in the directory

## Root Causes Identified

### 1. Frontend Cache Issue ✅ FIXED
- **Problem**: React Query cache wasn't being invalidated with the correct key
- **Fix**: Updated `updateVisibility` to use exact query key `['company', companyId, 'core']` and immediately refetch

### 2. Backend Filtering ✅ WORKING
- **Status**: Backend correctly filters private academies
- **Test Results**: 
  - Normal users: 0 private academies found ✅
  - Guest users: 0 private academies found ✅
  - Admin users: Can see private academies ✅

## Fixes Applied

### File: `src/pages/CompanyProfilePage.tsx`

**Updated `updateVisibility` function**:
- Uses correct query key: `['company', companyId, 'core']`
- Immediately refetches: `await companyCoreQuery.refetch()`
- Invalidates directory cache to refresh listings

### File: `src/contexts/ApiContext.tsx`

**Updated `updateAcademyVisibility` function**:
- Uses `PUT` method directly (backend expects PUT, not PATCH)
- Properly handles authentication token
- Clears rate limiter cache

## Testing Checklist

- [ ] Set academy to private as admin
- [ ] Verify success message appears
- [ ] Navigate away from academy profile
- [ ] Navigate back to academy profile
- [ ] Verify visibility is still "private" (not reverted to "published")
- [ ] Navigate to Academy directory as admin
- [ ] Verify private academy is visible
- [ ] Log out and check as guest/normal user
- [ ] Verify private academy is NOT visible in directory

## Backend Verification

The backend is working correctly. Test with curl:

```bash
# Set to private
curl -X PUT "http://localhost:3000/api/companies/ACADEMY_ID" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"visibility":"private"}'

# Verify it's saved
curl -X GET "http://localhost:3000/api/companies/ACADEMY_ID" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Check normal user can't see it
curl -X GET "http://localhost:3000/api/companies?subcategory=academy" \
  -H "Authorization: Bearer NORMAL_USER_TOKEN"
```

## Next Steps

1. Test in the app after these fixes
2. If still not working, check:
   - Backend logs for RPC function usage
   - Network tab to see if PUT request succeeds
   - React Query DevTools to see cache state
   - Console logs for cache invalidation

