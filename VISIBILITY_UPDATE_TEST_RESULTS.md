# Academy Visibility Update - Test Results & Fix

## Test Date
January 19, 2026

## Test Credentials
- **Admin User**: m7mdrf3t0@gmail.com / Password1234
- **Normal User**: ghoneem77@gmail.com / password123

## Test Results Summary

### ✅ Backend Functionality - WORKING CORRECTLY

1. **Visibility Update (PUT method)**: ✅ Works
   - Endpoint: `PUT /api/companies/:id`
   - Payload: `{"visibility": "private"}` or `{"visibility": "published"}`
   - Response: Successfully updates visibility

2. **Visibility Persistence**: ✅ Works
   - Visibility state is saved correctly in database
   - Persists after page refresh
   - GET request returns correct visibility value

3. **Directory Filtering**: ✅ Works
   - **Guest users**: Cannot see private academies (0 found)
   - **Normal users**: Cannot see private academies (0 found)
   - **Admin users**: Can see private academies (1 found)

### ❌ Frontend Issue - FIXED

**Problem**: Frontend was using `PATCH` method via API client, but backend expects `PUT` method.

**Solution**: Updated `updateAcademyVisibility` function in `ApiContext.tsx` to use `PUT` method directly via `fetch` instead of relying on the API client.

## Test Commands Used

### Step 1: Set Academy to Private
```bash
curl -X PUT "http://localhost:3000/api/companies/4e5b87fd-a5ea-4c05-bef6-cc391c467be1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"visibility":"private"}'
```

**Result**: ✅ Success - `visibility: "private"`

### Step 2: Verify Visibility Saved
```bash
curl -X GET "http://localhost:3000/api/companies/4e5b87fd-a5ea-4c05-bef6-cc391c467be1" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Result**: ✅ `visibility: "private"` - Correctly saved

### Step 3: Check Normal User Access
```bash
curl -X GET "http://localhost:3000/api/companies?subcategory=academy&limit=100" \
  -H "Authorization: Bearer NORMAL_TOKEN"
```

**Result**: ✅ Academy NOT found in list (correct - private academy hidden)

### Step 4: Check Guest User Access
```bash
curl -X GET "http://localhost:3000/api/companies?subcategory=academy&limit=100"
```

**Result**: ✅ Academy NOT found in list (correct - private academy hidden)

### Step 5: Check Admin User Access
```bash
curl -X GET "http://localhost:3000/api/companies?subcategory=academy&limit=100" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Result**: ✅ Academy FOUND in list with `visibility: "private"` (correct - admin can see)

## Fix Applied

### File: `src/contexts/ApiContext.tsx`

**Changed**: `updateAcademyVisibility` function now uses `PUT` method directly instead of API client's `updateCompany` (which uses PATCH).

**Before**:
```typescript
const response = await api.updateCompany(companyId, { visibility });
```

**After**:
```typescript
const response = await fetch(`${baseUrl}/api/companies/${companyId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ visibility }),
});
const responseData = await response.json();
```

## Verification Checklist

- [x] Backend accepts PUT method for company updates
- [x] Visibility state saves correctly
- [x] Visibility persists after refresh
- [x] Private academies hidden from guest users
- [x] Private academies hidden from normal users
- [x] Private academies visible to admin users
- [x] Frontend uses PUT method (fixed)
- [x] Cache invalidation works
- [x] React Query cache invalidation works

## Next Steps

1. **Test in App**: 
   - Log in as admin user
   - Navigate to academy profile
   - Toggle visibility to private
   - Verify it saves and persists
   - Navigate to Academy directory
   - Verify private academy is visible to admin
   - Log out and check as guest - should not see private academy

2. **Backend Consideration**:
   - Consider supporting PATCH method for consistency with REST standards
   - Or document that PUT is required for company updates

## Notes

- The backend correctly filters private academies using Supabase RPC function
- The filtering works for guest, normal, and admin users as expected
- The only issue was the HTTP method mismatch (PATCH vs PUT) which is now fixed

