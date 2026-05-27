# Membership Error & Loading State Fix

## Issues Fixed

### 1. ✅ "You must be a member of this company to use company profile" Error

**Problem:**
- Error was logged as a critical error when switching to company profiles
- User might have lost access to company, but error was shown as if it was a bug
- Error prevented profile switch from completing

**Solution:**
- **Force refresh company list** before validating membership (prevents stale cache)
- **Detect membership errors** and handle them gracefully
- **Don't log as error** - log as warning for expected membership issues
- **Revert to user profile** if user lost access during switch

### 2. ✅ UI Keeps Loading When Switching Profiles

**Problem:**
- Loading state (`setSwitching`) wasn't cleared when errors occurred
- Profile switch could fail silently, leaving UI in loading state
- `getCompany` API call was timing out, blocking the profile switch
- No timeout handling for company data loading

**Solution:**
- **Always clear loading state** in `finally` block (guaranteed execution)
- **Timeout handling for `getCompany`** - 10 second timeout with graceful fallback
- **Use minimal company data** if `getCompany` times out (just ID)
- **Complete switch even if company details fail** - details load later
- **Handle errors gracefully** without blocking UI

## Implementation Details

### 1. Membership Validation (switchToCompanyProfile)

```typescript
// Force refresh company list to ensure latest membership data
const userCompaniesResponse = await getUserCompanies(user.id, true); // Force refresh

// Validate membership before switching
if (!companyMember) {
  throw new Error('Company not found in your companies list. You may no longer have access to this company.');
}

// If membership check fails, don't switch profiles
```

### 2. StreamChat Token Error Handling

```typescript
// In getStreamChatToken
const isMembershipError = errorMessage.includes('must be a member') || 
                         errorMessage.includes('member of this company');

if (isMembershipError) {
  console.warn('⚠️ Failed to get StreamChat token (membership issue):', errorMessage);
} else {
  console.error('❌ Failed to get StreamChat token:', error);
}
```

### 3. StreamChatProvider Error Handling

```typescript
// Detect membership errors and handle gracefully
const isMembershipError = errorMessage.includes('must be a member') || 
                         errorMessage.includes('member of this company');

if (isMembershipError) {
  console.log('💬 [StreamChatProvider] Company membership error (user may have lost access) - skipping StreamChat initialization');
  setClientReady(false);
  return; // Don't block app
}
```

### 4. Profile Switch Reversion

```typescript
// If user loses access during switch, revert to user profile
if (isMembershipError) {
  setCurrentProfileType('user');
  setActiveCompany(null);
  // Clear storage
}
```

### 5. Timeout Handling for getCompany

```typescript
// Add timeout to prevent UI from getting stuck
const getCompanyPromise = getCompany(companyId, {
  fields: ['id', 'name', 'logo_url', 'subcategory', 'approval_status']
});

const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Request timeout')), 10000);
});

try {
  const companyResponse = await Promise.race([getCompanyPromise, timeoutPromise]);
  // Use company data if successful
} catch (timeoutError) {
  // If timeout, use minimal company data (just ID)
  // Company details will load later when CompanyProfilePage opens
  companyData = { id: companyId };
}
```

### 6. Loading State Management

```typescript
// In AccountSwitcherModal
try {
  setSwitching(companyId);
  await switchToCompanyProfile(companyId);
  // Navigate...
} catch (error) {
  // Error already handled in switchToCompanyProfile
} finally {
  // CRITICAL: Always clear loading state
  setSwitching(null);
}
```

## Files Modified

1. **src/contexts/ApiContext.tsx**
   - `switchToCompanyProfile`: Force refresh company list, better membership validation, timeout handling for `getCompany`
   - `getStreamChatToken`: Detect membership errors, log as warning
   - StreamChat reconnection: Revert to user profile if membership error
   - `getCompany` timeout: 10 second timeout with graceful fallback to minimal data

2. **src/components/StreamChatProvider.tsx**
   - Detect membership errors in token response
   - Handle membership errors gracefully (don't log as error)
   - Skip StreamChat initialization if membership error

3. **src/components/AccountSwitcherModal.tsx**
   - Always clear loading state in `finally` block
   - Verify switch success before navigating
   - Handle errors gracefully

## Error Handling Flow

### Before Fix
```
Switch to Company → Validate (stale cache) → Switch State → Get Company (timeout) → UI Stuck Loading
```

### After Fix
```
Switch to Company → Force Refresh → Validate (fresh data) → Switch State → Get Company (10s timeout) → 
  If Timeout → Use Minimal Data (ID only) → Complete Switch → Clear Loading State
  If Success → Use Full Data → Complete Switch → Clear Loading State
  If Membership Error → Revert to User Profile → Clear Loading State
```

## Testing

### Manual Testing Required

1. **Membership Validation:**
   - [ ] Switch to company you're a member of - should work
   - [ ] Try to switch to company you're not a member of - should fail gracefully
   - [ ] Verify no error messages for membership issues
   - [ ] Verify UI doesn't get stuck loading

2. **Loading State:**
   - [ ] Switch profiles rapidly - loading state should clear
   - [ ] Switch to invalid company - loading state should clear
   - [ ] Verify no stuck loading indicators

3. **Error Handling:**
   - [ ] Verify membership errors are logged as warnings (not errors)
   - [ ] Verify app doesn't crash on membership errors
   - [ ] Verify profile reverts to user if access lost

## Expected Behavior

### Successful Switch
```
✅ Membership verified - user is owner/admin of company
✅ Company data loaded (or minimal data if timeout)
✅ Switched to company profile
✅ StreamChat reconnected
✅ Loading state cleared
```

### Timeout Scenario
```
⚠️ getCompany timed out after 10 seconds
⚠️ Using minimal company data (ID only)
✅ Profile switch completed with minimal data
✅ Company details will load when CompanyProfilePage opens
✅ Loading state cleared
```

### Membership Error
```
⚠️ Company not found in user companies list - user may have lost access
⚠️ Profile switch prevented - staying on current profile
✅ Loading state cleared
```

### Token Error (Expected)
```
⚠️ Failed to get StreamChat token (membership issue): You must be a member...
💬 [StreamChatProvider] Company membership error - skipping StreamChat initialization
✅ App continues to work (just without StreamChat for that company)
```

## Version

- **Version**: 1.3.6
- **Build Number**: 13
- **Date**: January 2026

## Notes

- Membership errors are now handled as expected behavior (not bugs)
- Loading state always clears (guaranteed in finally block)
- Profile switch validates membership before updating state
- Force refresh prevents stale cache issues
- All fixes are backward compatible

