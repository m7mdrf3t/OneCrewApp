# Cache Fix Summary - Academy Visibility Persistence

## Problem
When setting an academy to private:
1. The visibility appears to update initially
2. But when navigating back and returning, it reverts to "published"
3. Normal users can still see the academy in the directory

## Root Causes

### 1. Rate Limiter Cache (30-minute TTL)
- The `getCompany` function uses rate limiter cache with 30-minute TTL
- Cache key format: `company-${companyId}-${JSON.stringify(params)}`
- Even after clearing cache, if params differ, different cache keys are used

### 2. React Query Cache
- React Query caches the company data
- Cache invalidation wasn't using the exact query key
- Query key didn't change after visibility update, so it used cached data

### 3. Persistent Storage Cache
- Rate limiter uses AsyncStorage for persistent cache
- Pattern matching might not catch all variations

## Fixes Applied

### 1. Added Timestamp to Query Key
- Added `visibilityUpdateTimestamp` state variable
- Query key now includes timestamp: `['company', companyId, 'core', refreshKey, visibilityUpdateTimestamp]`
- When visibility changes, timestamp updates, forcing a new query key and bypassing all caches

### 2. Aggressive Cache Clearing
- Clear rate limiter cache BEFORE update
- Clear rate limiter cache AFTER update
- Clear cache in `useFocusEffect` when screen comes into focus
- Clear cache in query function itself

### 3. Immediate Refetch with Verification
- After update, immediately refetch the company query
- Verify the visibility matches expected value
- If mismatch, retry after 500ms delay

### 4. Pattern-Based Cache Clearing
- Changed from `clearCache` to `clearCacheByPattern` to catch all variations
- Clears: `company-${companyId}`, `companies-`, etc.

## Files Modified

1. **src/pages/CompanyProfilePage.tsx**
   - Added `visibilityUpdateTimestamp` state
   - Updated query key to include timestamp
   - Enhanced `updateVisibility` to update timestamp and clear caches
   - Enhanced `useFocusEffect` to clear caches on focus
   - Always clear rate limiter cache in query function

2. **src/contexts/ApiContext.tsx**
   - Updated `updateAcademyVisibility` to use `clearCacheByPattern` instead of `clearCache`
   - Added logging for cache clearing

## Testing Steps

1. **Set Academy to Private**:
   - Navigate to academy profile as admin
   - Click visibility toggle → "Private"
   - Confirm the change
   - Check console logs for cache clearing messages

2. **Verify Persistence**:
   - Navigate away (back button)
   - Navigate back to academy profile
   - Visibility should still be "Private" (not reverted)
   - Check console logs for cache clearing on focus

3. **Verify Directory Filtering**:
   - Navigate to Home → Academy directory
   - As admin: Private academy should be visible
   - Log out and check as guest/normal user: Private academy should NOT be visible

## Expected Console Logs

When visibility is updated:
```
🧹 [updateVisibility] Cleared rate limiter cache before update
🎓 Updating academy visibility: <id> -> private
🧹 Cleared rate limiter cache for company: <id>
✅ Academy visibility updated successfully: private
🧹 [updateVisibility] Cleared rate limiter cache after update
🧹 [CompanyProfile] Cleared rate limiter cache for company: <id>
```

When screen comes into focus:
```
🧹 [CompanyProfile] useFocusEffect: Cleared cache for company: <id>
```

## If Still Not Working

1. Check network tab - verify PUT request succeeds (200 status)
2. Check console logs - verify cache clearing messages appear
3. Check React Query DevTools - verify query key changes after update
4. Check backend logs - verify visibility is actually saved in database
5. Try clearing app data/cache completely and retest

