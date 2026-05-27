# Frontend StreamChat Profile Switching Fix

## Problem

When switching to a company profile, StreamChat was still connected as the user (`onecrew_user_...`) instead of the company (`onecrew_company_...`). This caused permission errors when trying to read channels created from the company profile.

## Root Cause

The frontend was calling `/api/chat/token` without passing the profile type context, so the backend always returned a user token, even when on a company profile.

## Solution

Updated the frontend to pass profile type parameters when requesting StreamChat tokens:

- `profile_type=company` - indicates company profile
- `company_id=<company_id>` - the company ID to use

## Changes Made

### 1. Updated `getStreamChatToken` in `ApiContext.tsx`

**Before:**
```typescript
const getStreamChatToken = async () => {
  const response = await api.chat.getStreamChatToken();
  // ...
}
```

**After:**
```typescript
const getStreamChatToken = async (options?: { 
  profile_type?: 'user' | 'company'; 
  company_id?: string 
}) => {
  // Build query parameters
  let queryParams = '';
  if (options?.profile_type === 'company' && options?.company_id) {
    queryParams = `?profile_type=company&company_id=${encodeURIComponent(options.company_id)}`;
  }
  
  // Make direct HTTP call with query params
  const url = `${baseUrl}/api/chat/token${queryParams}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  // ...
}
```

### 2. Updated `StreamChatProvider.tsx`

**Before:**
```typescript
const tokenResponse = await getStreamChatToken();
```

**After:**
```typescript
const tokenOptions = currentProfileType === 'company' && activeCompany?.id
  ? { profile_type: 'company' as const, company_id: activeCompany.id }
  : { profile_type: 'user' as const };

const tokenResponse = await getStreamChatToken(tokenOptions);
```

### 3. Updated `switchToCompanyProfile` in `ApiContext.tsx`

**Before:**
```typescript
const streamTokenResponse = await api.chat.getStreamChatToken();
```

**After:**
```typescript
const streamTokenResponse = await getStreamChatToken({ 
  profile_type: 'company', 
  company_id: companyId 
});
```

### 4. Updated Type Definition

```typescript
getStreamChatToken: (options?: { 
  profile_type?: 'user' | 'company'; 
  company_id?: string 
}) => Promise<any>;
```

## How It Works Now

1. **User Profile (Default):**
   - Calls: `GET /api/chat/token?profile_type=user`
   - Returns: `onecrew_user_{userId}`
   - StreamChat connects as the user

2. **Company Profile:**
   - Calls: `GET /api/chat/token?profile_type=company&company_id={companyId}`
   - Returns: `onecrew_company_{companyId}`
   - StreamChat connects as the company

3. **Profile Switching:**
   - When switching to company profile, `StreamChatProvider` detects the change
   - Fetches a new token with company profile parameters
   - Reconnects StreamChat with the company identity
   - Can now read/write channels as the company

## Testing

After these changes:

1. **Login** - Should connect as user: `onecrew_user_...`
2. **Switch to company profile** - Should reconnect as company: `onecrew_company_...`
3. **Create conversation from company** - Should work without permission errors
4. **Read channels** - Company should be able to read channels it's a member of

## Backend Requirements (Already Implemented)

The backend `/api/chat/token` endpoint now supports:
- Query parameter: `profile_type=company`
- Query parameter: `company_id=<company_id>`
- Returns correct user ID format based on profile type
- Verifies user is a member of the company before returning company token

## Files Modified

1. `src/contexts/ApiContext.tsx`
   - Updated `getStreamChatToken` to accept profile parameters
   - Updated `switchToCompanyProfile` to pass company parameters
   - Updated login to use new function signature

2. `src/components/StreamChatProvider.tsx`
   - Updated to pass profile type when fetching tokens
   - Automatically detects profile changes and reconnects

## Summary

✅ Frontend now passes profile type context to backend  
✅ Backend returns correct user ID format (`onecrew_user_...` or `onecrew_company_...`)  
✅ StreamChat reconnects with correct identity when profile changes  
✅ Permission errors should be resolved  

The implementation is complete and ready for testing!

