# OneCrew API Client Update Summary (v2.13.0 → v2.13.1)

## Update Status
✅ **Successfully updated from v2.13.0 to v2.13.1**

## Package Information
- **Current Version**: v2.13.1
- **Previous Version**: v2.13.0
- **Repository**: https://github.com/onecrew/onecrew-api-client

## Key Changes in v2.13.1

### 🔧 Breaking Changes

#### 1. `verifyEmail` Method Type Parameter Changed
**Before (v2.13.0):**
```typescript
verifyEmail(email: string, token: string, type?: "signup" | "email_change"): Promise<void>
```

**After (v2.13.1):**
```typescript
verifyEmail(email: string, token: string, type?: "email" | "email_change"): Promise<void>
```

**Impact:**
- The `type` parameter no longer accepts `"signup"` as a value
- Use `"email"` instead of `"signup"` for email verification during signup
- This change fixes the "User with this email already exists" issue

**Migration:**
- Updated `ApiContext.tsx` interface to match new signature
- Updated `verifyEmail` implementation to use `"email"` instead of `"signup"`
- Updated `VerifyOtpPage.tsx` to call `verifyEmail(email, otpString, 'email')` instead of `'signup'`

## 📝 Code Changes Applied

### ✅ Updated `src/contexts/ApiContext.tsx`

1. **Updated Interface:**
   ```typescript
   // Before
   verifyEmail: (email: string, token: string, type?: "signup" | "email_change") => Promise<void>;
   
   // After
   verifyEmail: (email: string, token: string, type?: "email" | "email_change") => Promise<void>;
   ```

2. **Updated Implementation:**
   ```typescript
   // Before
   const verifyEmail = async (email: string, token: string, type?: "signup" | "email_change") => {
     await api.auth.verifyEmail(email, token, type);
   }
   
   // After
   const verifyEmail = async (email: string, token: string, type?: "email" | "email_change") => {
     await api.auth.verifyEmail(email, token, type);
   }
   ```

### ✅ Updated `src/pages/VerifyOtpPage.tsx`

**Changed email verification call:**
```typescript
// Before
await verifyEmail(email, otpString, 'signup');

// After
await verifyEmail(email, otpString, 'email');
```

### ✅ Updated `package.json`
- Changed version from `^2.13.0` to `^2.13.1`

## 🔍 Verification

### Type Checking
- ✅ No TypeScript errors after update
- ✅ Interface matches library signature
- ✅ Implementation matches interface
- ✅ All calls updated correctly

### Testing Recommendations
1. Test email verification flow end-to-end
2. Verify signup → email verification → OTP entry → success → login flow
3. Test that "User with this email already exists" error is resolved
4. Test email change verification flow (should still use 'email_change')

## 🐛 Bug Fix

This update fixes the issue where users were getting "User with this email already exists" errors during signup. The backend now correctly handles email verification with the `"email"` type parameter.

## Related Files
- `src/contexts/ApiContext.tsx` - Updated interface and implementation
- `src/pages/VerifyOtpPage.tsx` - Updated email verification call
- `package.json` - Updated version









