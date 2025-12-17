# OneCrew API Client Update Summary (v2.13.1 → v2.13.3)

## Update Status
✅ **Successfully updated from v2.13.1 to v2.13.3**

## Package Information
- **Current Version**: v2.13.3
- **Previous Version**: v2.13.1
- **Repository**: https://github.com/onecrew/onecrew-api-client

## Key Changes in v2.13.3

### 🔧 Breaking Changes

#### 1. `verifyEmail` Method Type Parameter Reverted
**v2.13.1:**
```typescript
verifyEmail(email: string, token: string, type?: "email" | "email_change"): Promise<void>
```

**v2.13.3:**
```typescript
verifyEmail(email: string, token: string, type?: "signup" | "email_change"): Promise<void>
```

**Impact:**
- The `type` parameter now accepts `"signup"` again (reverted from `"email"`)
- Use `"signup"` for email verification during signup flow
- Use `"email_change"` for email change verification

**Migration:**
- Updated `ApiContext.tsx` interface to match new signature
- Updated `verifyEmail` implementation to use `"signup"` instead of `"email"`
- Updated `VerifyOtpPage.tsx` to call `verifyEmail(email, otpString, 'signup')` instead of `'email'`

#### 2. `onSignupSuccess` Callback Now Requires Email Parameter
**Change:**
- Google Sign-In handlers now properly pass email to `onSignupSuccess` callback
- Email is extracted from auth response or form data

**Migration:**
- Updated `handleGoogleSignIn` to extract email from auth response
- Updated `handleCategorySelect` to extract email from auth response
- Both handlers now call `onSignupSuccess(email)` with proper email parameter

## 📝 Code Changes Applied

### ✅ Updated `src/contexts/ApiContext.tsx`

1. **Updated Interface:**
   ```typescript
   // v2.13.1
   verifyEmail: (email: string, token: string, type?: "email" | "email_change") => Promise<void>;
   
   // v2.13.3
   verifyEmail: (email: string, token: string, type?: "signup" | "email_change") => Promise<void>;
   ```

2. **Updated Implementation:**
   ```typescript
   // v2.13.1
   const verifyEmail = async (email: string, token: string, type?: "email" | "email_change") => {
     await api.auth.verifyEmail(email, token, type);
   }
   
   // v2.13.3
   const verifyEmail = async (email: string, token: string, type?: "signup" | "email_change") => {
     await api.auth.verifyEmail(email, token, type);
   }
   ```

### ✅ Updated `src/pages/VerifyOtpPage.tsx`

**Changed email verification call:**
```typescript
// v2.13.1
await verifyEmail(email, otpString, 'email');

// v2.13.3
await verifyEmail(email, otpString, 'signup');
```

### ✅ Updated `src/pages/SignupPage.tsx`

**Fixed Google Sign-In handlers to pass email:**
```typescript
// Before
const authResponse = await googleSignIn();
onSignupSuccess(); // Missing email parameter

// After
const authResponse = await googleSignIn();
const email = authResponse?.user?.email || formData.email.trim().toLowerCase() || '';
onSignupSuccess(email); // Properly passes email
```

### ✅ Updated `package.json`
- Changed version from `^2.13.1` to `^2.13.3`

## 🔍 Verification

### Type Checking
- ✅ No TypeScript errors after update
- ✅ Interface matches library signature
- ✅ Implementation matches interface
- ✅ All calls updated correctly

### Testing Recommendations
1. Test email verification flow end-to-end
2. Verify signup → email verification → OTP entry → success → login flow
3. Test Google Sign-In flow with email verification
4. Test email change verification flow (should still use 'email_change')

## 🐛 Bug Fixes

This update includes:
- Fix for email verification type parameter (reverted to 'signup')
- Fix for Google Sign-In email handling in signup flow
- Proper email parameter passing to success callbacks

## Related Files
- `src/contexts/ApiContext.tsx` - Updated interface and implementation
- `src/pages/VerifyOtpPage.tsx` - Updated email verification call
- `src/pages/SignupPage.tsx` - Fixed Google Sign-In email handling
- `package.json` - Updated version













