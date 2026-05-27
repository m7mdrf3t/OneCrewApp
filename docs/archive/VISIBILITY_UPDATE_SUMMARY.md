# Academy Visibility Update - Implementation Summary

## Changes Made

### 1. Frontend Updates

#### `src/pages/CompanyProfilePage.tsx`
- **Updated `updateVisibility` function** to invalidate React Query cache after visibility change
- Added cache invalidation for:
  - `directoryCompanies` queries (ensures directory refreshes)
  - `company` queries (ensures company profile refreshes)
- Updated success message to clarify that private academies are removed from directory for regular users

#### `src/pages/DirectoryPage.tsx`
- **Already updated** - Removed client-side filtering (backend handles it)
- Added development warning if private academies appear unexpectedly

#### `src/contexts/ApiContext.tsx`
- **Already updated** - Cache key includes user context for proper cache invalidation
- `updateAcademyVisibility` function clears rate limiter cache

### 2. Backend Requirements

The backend should:
1. ✅ Save visibility state when `PATCH /api/companies/:id` is called with `visibility: "private"` or `"published"`
2. ✅ Filter private academies using Supabase RPC function `get_companies_with_visibility`
3. ✅ Return only published academies for guest users
4. ✅ Return published + user's private academies for authenticated users (if owner/admin)

## How It Works

### Setting Academy to Private

1. **User Action**: Owner/admin clicks visibility toggle on academy profile page
2. **Confirmation**: Alert confirms the action (private = only admins can see)
3. **API Call**: `PATCH /api/companies/:id` with `{ visibility: "private" }`
4. **Backend**: Updates database, Supabase function filters results
5. **Cache Invalidation**: 
   - React Query cache invalidated for directory companies
   - Rate limiter cache cleared
6. **Directory Refresh**: When user navigates to directory, it refetches and shows updated list

### Viewing Directory as Guest/Regular User

1. **API Call**: `GET /api/companies?subcategory=academy`
2. **Backend**: Calls Supabase RPC function with `p_current_user_id = NULL` (guest) or user ID
3. **Filtering**: Function returns only:
   - Published academies (for everyone)
   - Private academies (only if user is owner/admin)
4. **Frontend**: Displays filtered results (no client-side filtering needed)

## Testing

### Manual Test Steps

1. **As Academy Owner**:
   - Navigate to academy profile
   - Click visibility toggle to set to "Private"
   - Confirm the change
   - Navigate to Home → Academy
   - Verify your academy still appears (you're the owner)

2. **As Guest/Regular User**:
   - Navigate to Home → Academy
   - Verify the private academy does NOT appear in the list
   - Only published academies should be visible

3. **Verify State Persistence**:
   - Set academy to private
   - Refresh the page
   - Verify academy is still private
   - Check database to confirm `visibility = 'private'`

### Automated Test Script

Run the test script with academy ID and owner token:

```bash
ACADEMY_ID="your_academy_id" OWNER_TOKEN="your_jwt_token" ./test-visibility-update-flow.sh
```

The script will:
1. Check current visibility
2. Set academy to private
3. Verify it's hidden from guest users
4. Verify it's visible to owner
5. Verify visibility was saved
6. Restore original visibility

## Verification Checklist

- [ ] Setting academy to private saves correctly
- [ ] Private academy disappears from directory for guest users
- [ ] Private academy disappears from directory for regular users
- [ ] Private academy remains visible to owner
- [ ] Private academy remains visible to admins
- [ ] Published academies visible to everyone
- [ ] Visibility state persists after page refresh
- [ ] Directory refreshes automatically after visibility change
- [ ] Cache is properly invalidated

## Backend Logs to Monitor

When testing, check backend logs for:

```
[CompanyService] Calling RPC function get_companies_with_visibility
```

If you see:
```
[CompanyService] RPC function error: ...
```
or
```
[CompanyService] Falling back to regular query
```

Then the RPC function may not be working correctly.

## Common Issues

### Issue: Private academy still visible to guest users
**Solution**: 
- Check backend is calling Supabase RPC function
- Verify `p_current_user_id` is `NULL` for guest requests
- Check Supabase function is deployed correctly

### Issue: Directory doesn't refresh after visibility change
**Solution**:
- Check React Query cache invalidation is working
- Verify `queryClient.invalidateQueries` is called
- Check network tab to see if directory refetches

### Issue: Visibility not saving
**Solution**:
- Check backend `PATCH /api/companies/:id` endpoint
- Verify `visibility` field is being saved to database
- Check database directly to confirm value

