# Profile Switching Fix - Conversations List Refresh

## Issues Fixed

### 1. ✅ 403 Error on Pending Company Members (Fixed)

**Problem:**
- Error logged: `"Only company owner or admin can perform this action"`
- This was expected behavior (non-owners can't view pending members) but was being logged as an error

**Fix:**
- Updated `getPendingCompanyMembers` in `ApiContext.tsx` to check for 403 errors first
- 403 errors are now handled silently (no error log)
- Only non-403 errors are logged

**Code Change:**
```typescript
// Before: Logged all errors, then checked for 403
catch (error: any) {
  console.error('Failed to get pending company members:', error);
  if (error.status === 403) { ... }
}

// After: Check for 403 first, only log other errors
catch (error: any) {
  if (error.status === 403 || error.statusCode === 403) {
    // Silently handle 403 - expected when not owner/admin
    return { success: true, data: { data: [] } };
  }
  console.error('Failed to get pending company members:', error);
}
```

### 2. ✅ Conversations List Not Refreshing on Profile Switch (Fixed)

**Problem:**
- When switching between user and company profiles, conversations list showed "Error loading channel list..."
- Required app restart to see conversations
- ChannelList component wasn't re-querying when profile changed

**Root Cause:**
- `ChannelList` component caches queries based on filters
- When profile switches, StreamChat client reconnects with new user ID
- But `ChannelList` wasn't remounting/re-querying with new filters

**Fix:**
- Added a `key` prop to `ChannelList` that changes when profile switches
- Key format: `${currentStreamUserId}-${currentProfileType}-${activeCompany?.id}`
- Forces component remount and re-query when profile changes
- Added logging to track profile changes

**Code Changes:**

1. **Added key generation:**
```typescript
const channelListKey = useMemo(() => {
  return `${currentStreamUserId || 'no-user'}-${currentProfileType}-${activeCompany?.id || 'no-company'}`;
}, [currentStreamUserId, currentProfileType, activeCompany?.id]);
```

2. **Added key to ChannelList:**
```typescript
<ChannelList
  key={channelListKey}  // Forces remount when profile changes
  filters={filters}
  sort={sort}
  ...
/>
```

3. **Added profile change logging:**
```typescript
useEffect(() => {
  console.log('💬 [ConversationsListPage] Profile changed, refreshing channel list...', {
    currentStreamUserId,
    currentProfileType,
    activeCompanyId: activeCompany?.id,
    channelListKey,
  });
}, [channelListKey, currentStreamUserId, currentProfileType, activeCompany?.id]);
```

4. **Improved error handling:**
```typescript
onError={(error) => {
  // Don't log connection errors as they're handled by StreamChatProvider
  if (error?.message?.includes('tokens are not set')) {
    console.warn('⚠️ StreamChat not connected yet, will retry...');
    return;
  }
  console.error('❌ ChannelList error:', error);
}}
```

## How It Works

1. **Profile Switch:**
   - User switches from user profile to company profile (or vice versa)
   - `StreamChatProvider` reconnects StreamChat with new user ID
   - `currentStreamUserId` changes (e.g., `onecrew_user_...` → `onecrew_company_...`)

2. **Key Change:**
   - `channelListKey` recalculates with new values
   - React sees different key and remounts `ChannelList` component

3. **Re-query:**
   - New `ChannelList` instance queries StreamChat with new filters
   - Filters use new `currentStreamUserId` (company ID instead of user ID)
   - Shows conversations for the new profile

## Testing

### Test 1: Switch User → Company
1. Start on user profile
2. Open conversations list (should show user conversations)
3. Switch to company profile
4. Open conversations list (should show company conversations - NO RESTART NEEDED!)

### Test 2: Switch Company → User
1. Start on company profile
2. Open conversations list (should show company conversations)
3. Switch to user profile
4. Open conversations list (should show user conversations - NO RESTART NEEDED!)

### Test 3: Switch Company A → Company B
1. Start on Company A profile
2. Open conversations list (should show Company A conversations)
3. Switch to Company B profile
4. Open conversations list (should show Company B conversations - NO RESTART NEEDED!)

## Expected Behavior

✅ **Before Fix:**
- Switch profile → Conversations list shows error
- Need to restart app to see conversations

✅ **After Fix:**
- Switch profile → Conversations list automatically refreshes
- Shows correct conversations for current profile
- No app restart needed

## Logs to Watch

When switching profiles, you should see:
```
💬 [ConversationsListPage] Profile changed, refreshing channel list...
  currentStreamUserId: "onecrew_company_..."
  currentProfileType: "company"
  activeCompanyId: "..."
  channelListKey: "onecrew_company_...-company-..."
```

## Related Files

- `src/pages/ConversationsListPage.tsx` - Main fix
- `src/contexts/ApiContext.tsx` - 403 error handling fix
- `src/components/StreamChatProvider.tsx` - Handles StreamChat reconnection

## Status

✅ **COMPLETE** - Both issues fixed and ready for testing

