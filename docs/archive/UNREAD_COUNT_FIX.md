# Unread Message Count Fix - Profile Switching

## Issue

The unread message counter in the envelope icon was not reflecting the correct count:
1. **Not updating correctly** when switching between user and company profiles
2. **Showing incorrect counts** - including messages from other profiles
3. **Not resetting** when switching profiles

## Root Cause

1. **StreamChat's unread count includes ALL channels** - StreamChat's `total_unread_count` from `connectUser` response includes all unread messages for the StreamChat user, regardless of which profile (user vs company) is currently active.

2. **No profile filtering** - The `calculateStreamChatUnreadCount` function was querying all channels without filtering by current profile type.

3. **Not resetting on profile switch** - When switching profiles, the unread count wasn't being reset and recalculated for the new profile.

4. **Using StreamChat events directly** - Event handlers were using `event.total_unread_count` directly, which includes all channels regardless of profile.

## Fix Applied

### 1. Reset Unread Count on Profile Switch ✅

**File:** `src/contexts/ApiContext.tsx`

- Added `setUnreadConversationCount(0)` when switching to user profile
- Added `setUnreadConversationCount(0)` when switching to company profile
- Ensures count starts at 0 for new profile

### 2. Use Backend as Primary Source ✅

**File:** `src/contexts/ApiContext.tsx` - `calculateStreamChatUnreadCount`

- Changed to return 0 and rely on backend `getConversations` for accurate count
- Backend correctly filters conversations by `profile_type` and `participant_id`
- StreamChat's count is not profile-aware, so backend is the source of truth

### 3. Update Count After Profile Switch ✅

**File:** `src/contexts/ApiContext.tsx` - `switchToUserProfile` and `switchToCompanyProfile`

- Added immediate call to `getConversations({ limit: 100 })` after profile switch
- Added delayed call after StreamChat reconnection completes
- Ensures count updates quickly after switching

### 4. Fixed Event Handlers ✅

**File:** `src/contexts/ApiContext.tsx` - Unread count tracking useEffect

- Changed `handleUnreadUpdate` to call `updateUnreadCount()` instead of using `event.total_unread_count` directly
- All event handlers now trigger backend recalculation instead of using StreamChat's count
- Ensures profile-aware filtering

### 5. Updated Update Logic ✅

**File:** `src/contexts/ApiContext.tsx` - `updateUnreadCount` function

- Changed to always use backend `getConversations` as primary source
- StreamChat calculation is now fallback only (and returns 0)
- Backend correctly filters by current profile type

### 6. Faster Refresh Interval ✅

**File:** `src/contexts/ApiContext.tsx` - Periodic refresh

- Changed refresh interval from 10 seconds to 5 seconds
- Faster updates after profile switches

## Changes Summary

| Change | Location | Impact |
|--------|----------|--------|
| Reset count on switch | `switchToUserProfile`, `switchToCompanyProfile` | Count starts at 0 for new profile |
| Use backend as source | `calculateStreamChatUnreadCount` | Accurate profile-filtered count |
| Update after switch | Profile switch functions | Count updates immediately |
| Fixed event handlers | Unread count useEffect | Events trigger backend recalculation |
| Updated update logic | `updateUnreadCount` | Always uses backend for accuracy |
| Faster refresh | Periodic interval | Updates every 5 seconds |

## How It Works Now

1. **On Profile Switch:**
   - Unread count is reset to 0
   - Profile state is updated
   - StreamChat reconnects with new profile
   - Backend `getConversations` is called immediately (200ms delay)
   - Backend `getConversations` is called again after StreamChat reconnects (500ms delay)
   - Backend filters conversations by current profile type and calculates unread count
   - Count is updated in UI

2. **On New Message:**
   - StreamChat event fires (`notification.message_new`)
   - Event handler calls `updateUnreadCount()`
   - Backend `getConversations` is called
   - Backend filters by current profile and calculates count
   - Count is updated in UI

3. **On Mark as Read:**
   - StreamChat event fires (`notification.mark_read`)
   - Event handler calls `updateUnreadCount()`
   - Backend `getConversations` is called
   - Backend filters by current profile and calculates count
   - Count is updated in UI

4. **Periodic Updates:**
   - Every 5 seconds, `updateUnreadCount()` is called
   - Backend `getConversations` is called
   - Count is refreshed

## Backend Filtering

The backend `getConversations` API correctly filters conversations:

```typescript
// Backend filters by:
profile_type: 'user' | 'company'
participant_id: user.id | company.id
participant_type: 'user' | 'company'
```

This ensures only conversations belonging to the current profile are counted.

## Testing Checklist

### Test 1: User Profile Unread Count
- [ ] Switch to user profile
- [ ] Check envelope badge shows correct unread count for user conversations only
- [ ] Send a message to user profile
- [ ] Verify badge count increases
- [ ] Mark conversation as read
- [ ] Verify badge count decreases

### Test 2: Company Profile Unread Count
- [ ] Switch to company profile
- [ ] Check envelope badge shows correct unread count for company conversations only
- [ ] Send a message to company profile
- [ ] Verify badge count increases
- [ ] Mark conversation as read
- [ ] Verify badge count decreases

### Test 3: Profile Switching
- [ ] Start on user profile with unread messages
- [ ] Note the unread count
- [ ] Switch to company profile
- [ ] Verify count resets to 0 (or shows company unread count)
- [ ] Switch back to user profile
- [ ] Verify count shows user unread count (not company count)

### Test 4: Multiple Profiles
- [ ] Have unread messages for both user and company profiles
- [ ] Switch between profiles
- [ ] Verify each profile shows its own unread count
- [ ] Verify counts don't mix between profiles

### Test 5: Real-time Updates
- [ ] Open app on user profile
- [ ] Have someone send a message to user profile
- [ ] Verify badge updates within 5 seconds
- [ ] Switch to company profile
- [ ] Have someone send a message to company profile
- [ ] Verify badge updates within 5 seconds

### Test 6: Mark as Read
- [ ] Have unread messages on user profile
- [ ] Open conversation and mark as read
- [ ] Verify badge count decreases immediately
- [ ] Switch to company profile
- [ ] Verify user unread count doesn't affect company count

## Expected Behavior

### Before Fix
- ❌ Unread count includes messages from all profiles
- ❌ Count doesn't reset when switching profiles
- ❌ Count shows incorrect number after profile switch
- ❌ Real-time updates may show wrong count

### After Fix
- ✅ Unread count only shows messages for current profile
- ✅ Count resets to 0 when switching profiles
- ✅ Count updates correctly after profile switch
- ✅ Real-time updates show correct profile-filtered count
- ✅ User and company profiles have independent counts

## Files Modified

- `src/contexts/ApiContext.tsx`
  - `calculateStreamChatUnreadCount` - Returns 0, relies on backend
  - `switchToUserProfile` - Resets count, triggers update
  - `switchToCompanyProfile` - Resets count, triggers update
  - `updateUnreadCount` - Always uses backend
  - Unread count tracking useEffect - Fixed event handlers

## Performance Impact

- **Minimal** - Backend `getConversations` is already being called
- **Faster updates** - Refresh interval reduced from 10s to 5s
- **More accurate** - Profile-aware filtering ensures correct counts

## Notes

- Backend `getConversations` API is the source of truth for unread counts
- StreamChat's unread count is not used directly (not profile-aware)
- Count updates happen immediately after profile switch
- Periodic refresh ensures count stays accurate

---

**Status:** ✅ Fixed and ready for testing
**Date:** January 28, 2026
