# OneCrew API Client Update Summary (v2.12.0 → v2.13.0)

## Update Status
✅ **Successfully updated from v2.12.0 to v2.13.0**

## Package Information
- **Current Version**: v2.13.0
- **Previous Version**: v2.12.0
- **Repository**: https://github.com/onecrew/onecrew-api-client
- **Published**: Very recent (just published)
- **Package Size**: ~154.3 KB

## Key Changes in v2.13.0

### 🔧 Breaking Changes

#### 1. `verifyEmail` Method Signature Changed
**Before (v2.12.0):**
```typescript
verifyEmail(token: string, type?: "signup" | "email_change"): Promise<void>
```

**After (v2.13.0):**
```typescript
verifyEmail(email: string, token: string, type?: "signup" | "email_change"): Promise<void>
```

**Impact:**
- The method now requires `email` as the first parameter
- This is a breaking change - all calls to `verifyEmail` must be updated

**Migration:**
- Updated `ApiContext.tsx` interface to match new signature
- Updated `verifyEmail` implementation to accept `email` as first parameter
- **Note**: Any code calling `verifyEmail` will need to be updated to pass email as first argument

### 📝 Code Changes Applied

#### ✅ Updated `src/contexts/ApiContext.tsx`

1. **Updated Interface:**
   ```typescript
   // Before
   verifyEmail: (token: string, type?: "signup" | "email_change") => Promise<void>;
   
   // After
   verifyEmail: (email: string, token: string, type?: "signup" | "email_change") => Promise<void>;
   ```

2. **Updated Implementation:**
   ```typescript
   // Before
   const verifyEmail = async (token: string, type?: "signup" | "email_change") => {
     await api.auth.verifyEmail(token, type);
   }
   
   // After
   const verifyEmail = async (email: string, token: string, type?: "signup" | "email_change") => {
     await api.auth.verifyEmail(email, token, type);
   }
   ```

#### ✅ Updated `package.json`
- Changed version from `^2.12.0` to `^2.13.0`

## ⚠️ Important Notes

### Breaking Change Impact
- **Any code that calls `verifyEmail` must be updated** to pass email as the first parameter
- If email verification is called from email links or deep links, the email must be extracted from the token or passed separately
- Check all places where `verifyEmail` is called and ensure email is available

### Places That May Need Updates
- Email verification links/URLs
- Deep linking handlers
- Email verification pages/components
- Any automated email verification flows

## 🔍 Verification

### Type Checking
- ✅ No TypeScript errors after update
- ✅ Interface matches library signature
- ✅ Implementation matches interface

### Testing Recommendations
1. Test email verification flow end-to-end
2. Verify email verification links work correctly
3. Test email change verification flow
4. Ensure email parameter is available in all verification scenarios

## 📚 Additional Notes

- The library maintains backward compatibility for most other methods
- No other breaking changes detected in type definitions
- All other API methods remain unchanged

## Next Steps

1. ✅ Update complete - package installed and types updated
2. ⚠️ **Action Required**: Review all places where `verifyEmail` is called and ensure email is available
3. ⚠️ **Action Required**: Update email verification links/flows to include email parameter
4. Test email verification functionality thoroughly

## Related Files
- `src/contexts/ApiContext.tsx` - Updated interface and implementation
- `package.json` - Updated version
- Any pages/components that call `verifyEmail` - May need updates

