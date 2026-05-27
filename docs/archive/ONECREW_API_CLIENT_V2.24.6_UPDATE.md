# OneCrew API Client Update Summary (v2.24.5 → v2.24.6)

## Update Status
✅ **Successfully updated from v2.24.5 to v2.24.6**

## Package Information
- **Current Version**: v2.24.6
- **Previous Version**: v2.24.5
- **Repository**: https://github.com/onecrew/onecrew-api-client
- **Published**: 2025-12-22 (Latest version)
- **Package Size**: ~182.4 KB

## Overview

This release includes two important improvements:
1. **Debug logging improvements** - Previously applied via patch-package, now officially included
2. **New method for pending company members** - Dedicated endpoint to retrieve pending invitations

## Key Changes in v2.24.6

### ✨ New Feature: Get Pending Company Members

**What's New:**
- New method `api.getPendingCompanyMembers(companyId, params?)` to retrieve pending company members
- Dedicated endpoint: `GET /api/companies/:id/members/pending`
- Returns users who were sent invitations but haven't accepted yet
- Includes user information and inviter details
- Supports pagination and sorting

**TypeScript Signature:**
```typescript
getPendingCompanyMembers(
  companyId: string, 
  params?: {
    page?: number;
    limit?: number;
    sort?: 'invited_at' | 'created_at' | 'role';
    order?: 'asc' | 'desc';
  }
): Promise<ApiResponse<{
  data: Array<{
    company_id: string;
    user_id: string;
    role: CompanyMemberRole;
    invitation_status: 'pending';
    invited_at: string;
    invited_by: string;
    user: {
      id: string;
      name: string;
      email: string;
      image_url?: string;
      category: string;
      primary_role: string;
    };
    inviter: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}>>
```

**Usage Example:**
```typescript
// Get pending members for a company
const result = await api.getPendingCompanyMembers('company-id', {
  page: 1,
  limit: 50,
  sort: 'invited_at',
  order: 'desc'
});

if (result.success) {
  const pendingMembers = result.data.data;
  pendingMembers.forEach(member => {
    console.log(`${member.user.name} invited by ${member.inviter.name}`);
    console.log(`Invited at: ${member.invited_at}`);
  });
}
```

**Benefits:**
- **More efficient**: Dedicated endpoint instead of filtering all members client-side
- **Better performance**: Backend can optimize queries for pending members only
- **Cleaner code**: No need to filter `invitation_status === 'pending'` in frontend
- **Includes inviter info**: Know who sent each invitation
- **Proper pagination**: Handles large lists of pending invitations

**Access Requirements:**
- Requires authentication
- Requires company admin or owner access
- Returns 403 if user doesn't have permission

### 🔧 Debug Logging Improvements (Now Official)

**What Changed:**
- Debug logging is now conditionally enabled via `globalThis.ONECREW_API_DEBUG` flag
- Authorization headers are automatically masked in debug logs (shows `Bearer ***` instead of actual token)
- Reduces console noise and prevents accidental token leakage in production
- Improves app startup performance by disabling verbose logging by default

**Before (v2.24.5 with patch):**
```javascript
console.log('🌐 Making request to:', url);
console.log('📤 Request body:', body);
console.log('📤 Request headers:', requestHeaders); // Could leak tokens
console.log('✅ Response received:', data);
```

**After (v2.24.6):**
```javascript
// Debug logging (disabled by default to avoid leaking auth tokens and slowing down app startup).
// To enable: set `globalThis.ONECREW_API_DEBUG = true` in the app runtime.
const debug = typeof globalThis !== 'undefined' && globalThis.ONECREW_API_DEBUG === true;
if (debug) {
    const safeHeaders = { ...requestHeaders };
    if (safeHeaders.Authorization) {
        safeHeaders.Authorization = 'Bearer ***';
    }
    console.log('🌐 Making request to:', url);
    console.log('📤 Request body:', body);
    console.log('📤 Request headers:', safeHeaders);
}
// ... response logging also conditional
```

### 🎯 Benefits

1. **Security**: Authorization tokens are automatically masked in logs
2. **Performance**: Reduced console noise improves app startup time
3. **Developer Experience**: Can enable debug logging when needed for troubleshooting
4. **No Breaking Changes**: Existing code continues to work without modification

## Migration Guide

### No Breaking Changes

This update is backward compatible. Existing code continues to work without modification.

### Optional: Use New `getPendingCompanyMembers()` Method

The new `getPendingCompanyMembers()` method provides a cleaner way to fetch pending members. You can optionally update your code to use it.

**Current Approach (still works):**
```typescript
// Using getCompanyMembers and filtering client-side
const response = await getCompanyMembers(companyId, {
  include_pending: true,
  status: 'all',
  invitation_status: 'all',
});

const pendingMembers = response.data.filter(
  (m: CompanyMember) => m.invitation_status === 'pending'
);
```

**New Approach (recommended):**
```typescript
// Using dedicated getPendingCompanyMembers method
const response = await api.getPendingCompanyMembers(companyId, {
  page: 1,
  limit: 50,
  sort: 'invited_at',
  order: 'desc'
});

const pendingMembers = response.data.data; // Already filtered by backend
```

**Integration Example for `CompanyMembersManagementPage.tsx`:**

You can update the `loadMembers` function to use the new method:

```typescript
const loadMembers = async (forceRefresh: boolean = false) => {
  try {
    setLoading(true);
    
    if (forceRefresh) {
      await rateLimiter.clearCacheByPattern(`company-members-${company.id}`);
    }
    
    // Load active members
    const activeResponse = await getCompanyMembers(company.id, {
      page: 1,
      limit: 100,
      sort: 'joined_at',
      order: 'desc',
    });
    
    // Load pending members using new dedicated method
    const pendingResponse = await api.getPendingCompanyMembers(company.id, {
      page: 1,
      limit: 100,
      sort: 'invited_at',
      order: 'desc',
    });
    
    if (activeResponse.success && activeResponse.data) {
      const membersArray = Array.isArray(activeResponse.data)
        ? activeResponse.data
        : activeResponse.data.data || [];
      
      const accepted = membersArray.filter((m: CompanyMember) => 
        m.invitation_status === 'accepted' && !m.deleted_at
      );
      setActiveMembers(accepted);
    }
    
    if (pendingResponse.success && pendingResponse.data) {
      const pendingArray = pendingResponse.data.data || [];
      setPendingInvitations(pendingArray);
    }
  } catch (error) {
    console.error('Failed to load members:', error);
  } finally {
    setLoading(false);
  }
};
```

**Add to ApiContext (Optional):**

You can add a wrapper method in `ApiContext.tsx`:

```typescript
const getPendingCompanyMembers = async (companyId: string, params?: {
  page?: number;
  limit?: number;
  sort?: 'invited_at' | 'created_at' | 'role';
  order?: 'asc' | 'desc';
}) => {
  try {
    const response = await api.getPendingCompanyMembers(companyId, params);
    return response;
  } catch (error) {
    console.error('Failed to get pending company members:', error);
    throw error;
  }
};
```

### Optional: Enable Debug Logging

If you need to debug API requests, you can enable debug logging by setting a global flag:

**In your app initialization (e.g., `App.tsx` or `index.ts`):**
```typescript
// Enable debug logging for API requests
if (__DEV__) {
  // @ts-ignore
  globalThis.ONECREW_API_DEBUG = true;
}
```

**Or conditionally enable it:**
```typescript
// Enable only when needed
if (process.env.NODE_ENV === 'development' && someDebugFlag) {
  // @ts-ignore
  globalThis.ONECREW_API_DEBUG = true;
}
```

### Remove Old Patch File (Optional)

Since the patch is now included in the official package, you can optionally remove the old patch file:

```bash
rm patches/onecrew-api-client+2.24.5.patch
```

**Note**: The patch file will be automatically ignored by patch-package since the changes are now in the official package.

## Patch File Status

✅ **Patch file no longer needed**: The changes from `patches/onecrew-api-client+2.24.5.patch` are now included in v2.24.6. The patch-package tool will automatically detect this and skip applying the patch.

## Testing Recommendations

### General Testing
1. **Verify API calls work normally**: All existing API calls should continue to work
2. **Check console output**: Should see less verbose logging by default
3. **Test debug mode** (optional): Enable `globalThis.ONECREW_API_DEBUG = true` and verify debug logs appear
4. **Verify token masking**: When debug is enabled, check that Authorization headers show `Bearer ***`

### Testing `getPendingCompanyMembers()`
1. **Test as company admin/owner**: Verify you can fetch pending members
2. **Test as regular member**: Should return 403 (unauthorized)
3. **Test pagination**: Verify pagination works with different page/limit values
4. **Test sorting**: Verify sorting by `invited_at`, `created_at`, and `role` works
5. **Verify response format**: Check that user and inviter information is included
6. **Test empty state**: Verify behavior when no pending members exist
7. **Compare with old method**: Verify results match `getCompanyMembers()` filtered by `invitation_status === 'pending'`

## Version History

- **v2.24.5**: Added patch for conditional debug logging
- **v2.24.6**: 
  - Incorporated debug logging improvements into official package
  - Added `getPendingCompanyMembers()` method for dedicated pending member retrieval

## Related Files

- `package.json` - Updated dependency version
- `patches/onecrew-api-client+2.24.5.patch` - No longer needed (changes are in official package)
- `src/contexts/ApiContext.tsx` - Optional: Add `getPendingCompanyMembers` wrapper method
- `src/pages/CompanyMembersManagementPage.tsx` - Optional: Update to use `getPendingCompanyMembers()` for pending tab

---

**Last Updated**: 2025-12-22  
**Documentation Version**: 1.0

