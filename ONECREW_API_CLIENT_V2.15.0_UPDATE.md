# OneCrew API Client Update Summary (v2.14.0 → v2.15.0)

## Update Status
✅ **Successfully updated from v2.14.0 to v2.15.0**

## Package Information
- **Current Version**: v2.15.0
- **Previous Version**: v2.14.0
- **Repository**: https://github.com/onecrew/onecrew-api-client
- **Published**: Latest version
- **Package Size**: ~154.3 KB

## Key Changes in v2.15.0

### 🎯 New Feature: Category Filtering for Roles

#### 1. `getRoles` Method Enhanced
**Before (v2.14.0):**
```typescript
getRoles(): Promise<ApiResponse<string[]>>
```

**After (v2.15.0):**
```typescript
getRoles(options?: {
    category?: 'crew' | 'talent' | 'company' | 'guest';
    active?: boolean;
}): Promise<ApiResponse<string[]>>
```

**Impact:**
- The method now accepts optional filters for roles
- Can filter roles by category ('crew', 'talent', 'company', 'guest')
- Can filter by active status (default: true)
- This allows fetching only crew roles or only talent roles directly from the API

#### 2. `getRolesWithDescriptions` Method Enhanced
**Before (v2.14.0):**
```typescript
getRolesWithDescriptions(): Promise<ApiResponse<Array<{
    value: string;
    label: string;
    description: string;
}>>>
```

**After (v2.15.0):**
```typescript
getRolesWithDescriptions(options?: {
    category?: 'crew' | 'talent' | 'company' | 'guest';
    active?: boolean;
}): Promise<ApiResponse<Array<{
    value: string;
    label: string;
    description?: string;
}>>>
```

**Impact:**
- Same category filtering capability as `getRoles`
- More efficient than fetching all roles and filtering client-side
- Reduces network payload and improves performance

## 📝 Code Changes Applied

### ✅ Updated `package.json`
- Changed version from `^2.14.0` to `^2.15.0`

### ✅ Updated `src/contexts/ApiContext.tsx`

1. **Updated Interface:**
   ```typescript
   // Before
   getRoles: () => Promise<any>;
   getRolesWithDescriptions: () => Promise<any>;
   
   // After
   getRoles: (options?: { category?: 'crew' | 'talent' | 'company' | 'guest'; active?: boolean }) => Promise<any>;
   getRolesWithDescriptions: (options?: { category?: 'crew' | 'talent' | 'company' | 'guest'; active?: boolean }) => Promise<any>;
   ```

2. **Updated `getRoles` Implementation:**
   - Now accepts optional `options` parameter
   - Passes category filter directly to API client
   - Uses category from options if provided, otherwise falls back to `getRoleCategory` helper
   - Updated performance monitoring to include query parameters in URL tracking

3. **Updated `getRolesWithDescriptions` Implementation:**
   - Now accepts optional `options` parameter
   - Passes category filter directly to API client
   - Falls back to `getRoles(options)` with same options if error occurs

## 🚀 Benefits

1. **Performance Improvement**: 
   - Fetching only crew or talent roles reduces payload size
   - Less data to process client-side

2. **Better API Utilization**:
   - Server-side filtering is more efficient
   - Reduces unnecessary data transfer

3. **Backward Compatibility**:
   - All existing code continues to work (options are optional)
   - No breaking changes for existing implementations

## 💡 Usage Examples

### Fetch All Roles (Existing Behavior)
```typescript
const { getRoles } = useApi();
const response = await getRoles();
```

### Fetch Only Crew Roles
```typescript
const { getRoles } = useApi();
const response = await getRoles({ category: 'crew' });
```

### Fetch Only Talent Roles
```typescript
const { getRoles } = useApi();
const response = await getRoles({ category: 'talent' });
```

### Fetch Roles with Descriptions (Filtered)
```typescript
const { getRolesWithDescriptions } = useApi();
const response = await getRolesWithDescriptions({ category: 'crew' });
```

## ⚠️ Important Notes

### Backward Compatibility
- ✅ All existing code continues to work without changes
- ✅ Options parameter is optional
- ✅ Default behavior (fetching all roles) is preserved

### Migration Recommendations
While not required, you can optimize existing code by:

1. **CategorySelectionModal.tsx**: Could use `getRoles({ category: 'crew' })` and `getRoles({ category: 'talent' })` instead of fetching all roles and filtering client-side

2. **SignupPage.tsx**: Could use category filtering when loading roles for specific categories

3. **SectionServicesPage.tsx**: Could use category filtering when displaying roles for specific sections

## 📋 Testing Checklist

- [x] Package updated successfully
- [x] Interface updated
- [x] Implementation updated
- [x] Backward compatibility maintained
- [ ] Test fetching all roles (no options)
- [ ] Test fetching crew roles only
- [ ] Test fetching talent roles only
- [ ] Test fetching roles with descriptions (filtered)
- [ ] Verify existing code still works

## 🔗 Related Files

- `package.json` - Updated dependency version
- `src/contexts/ApiContext.tsx` - Updated interface and implementation
- `src/pages/HomePageWithUsers.tsx` - ✅ **Updated to use category filtering**
- `src/components/CategorySelectionModal.tsx` - Could benefit from category filtering
- `src/pages/SignupPage.tsx` - Could benefit from category filtering
- `src/pages/SectionServicesPage.tsx` - Could benefit from category filtering

## ✅ Additional Updates

### HomePageWithUsers.tsx
**Updated to use the new category filtering feature:**

1. **Separate State Management:**
   - Changed from single `roles` state to separate `crewRoles` and `talentRoles` states
   - This allows independent loading and management of crew and talent roles

2. **Optimized Role Fetching:**
   - Now fetches crew roles using: `getRoles({ category: 'crew' })`
   - Now fetches talent roles using: `getRoles({ category: 'talent' })`
   - Removed client-side filtering with `filterRolesByCategory` (no longer needed)

3. **Performance Benefits:**
   - Reduced network payload (only fetches needed roles)
   - Faster initial load (parallel fetching of crew and talent roles)
   - More efficient data processing (no client-side filtering needed)

4. **Code Cleanup:**
   - Removed unused `filterRolesByCategory` import
   - Updated dependencies in `useMemo` hooks to use `crewRoles` and `talentRoles`

