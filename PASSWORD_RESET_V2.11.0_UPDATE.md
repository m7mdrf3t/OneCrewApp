# Password Reset Flow Update - v2.11.0

## ✅ Migration Complete

The app has been successfully updated to use the new **two-step OTP verification process** from `onecrew-api-client@2.11.0`.

## What Changed?

### Old Flow (v2.10.0 and earlier)
1. User requests password reset → receives email with link
2. User clicks link → enters new password directly

### New Flow (v2.11.0)
1. **Request Reset**: User enters email → receives OTP code
2. **Verify OTP**: User enters 6-digit code → receives reset token
3. **Update Password**: User enters new password using reset token

## Updated Files

### 1. `src/contexts/ApiContext.tsx`
- ✅ Updated `forgotPassword()` to use `api.auth.requestPasswordReset(email)`
- ✅ Added `verifyResetOtp()` method to verify OTP and get reset token
- ✅ Updated `resetPassword()` to use `resetToken` instead of OTP code
- ✅ Added `verifyResetOtp` to context interface and exports

### 2. `src/pages/VerifyOtpPage.tsx` (NEW)
- ✅ Created new OTP verification page
- ✅ 6-digit code input with auto-focus
- ✅ Paste support for OTP codes
- ✅ Resend OTP functionality
- ✅ Error handling for invalid/expired codes

### 3. `src/pages/ForgotPasswordPage.tsx`
- ✅ Updated to navigate to `verify-otp` screen instead of `reset-password`
- ✅ Changed prop from `onNavigateToResetPassword` to `onNavigateToVerifyOtp`
- ✅ Updated success message to mention OTP code instead of link
- ✅ Updated resend functionality

### 4. `src/pages/ResetPasswordPage.tsx`
- ✅ Changed prop from `token` to `resetToken`
- ✅ Updated to use `resetToken` in API call
- ✅ Updated error messages for token expiry

### 5. `App.tsx`
- ✅ Added `verify-otp` to auth page types
- ✅ Added `resetEmail` state to track email between screens
- ✅ Added `handleNavigateToVerifyOtp()` handler
- ✅ Updated `handleNavigateToResetPassword()` to accept reset token
- ✅ Added `handleResendOtp()` for resending OTP codes
- ✅ Added `VerifyOtpPage` rendering in auth flow
- ✅ Updated `ForgotPasswordPage` props

## New User Flow

### Step 1: Request Password Reset
```
User enters email → Clicks "Send Reset Link"
→ API: requestPasswordReset(email)
→ Navigate to VerifyOtpPage
```

### Step 2: Verify OTP Code
```
User enters 6-digit code from email
→ API: verifyResetOtp(email, otpCode)
→ Returns: { resetToken: "..." }
→ Navigate to ResetPasswordPage with resetToken
```

### Step 3: Update Password
```
User enters new password
→ API: confirmPasswordReset(resetToken, newPassword)
→ Success → Navigate to LoginPage
```

## API Methods Used

### `api.auth.requestPasswordReset(email: string)`
- Sends OTP code to user's email
- No redirect URL needed

### `api.auth.verifyResetOtp(email: string, otpCode: string)`
- Verifies 6-digit OTP code
- Returns `{ resetToken: string }`
- Token valid for 10 minutes

### `api.auth.confirmPasswordReset(resetToken: string, newPassword: string)`
- Updates password using reset token (not OTP)
- Invalidates all user sessions
- User must sign in with new password

## Error Handling

### Invalid OTP Code
- Shows error: "Invalid or expired OTP code"
- Offers option to request new code
- Clears OTP input fields

### Expired Reset Token
- Shows error: "Reset token has expired"
- Prompts user to request new reset

### Rate Limiting (429)
- Shows wait time if provided
- Prevents spam requests

## Testing Checklist

- [ ] Request password reset with valid email
- [ ] Verify OTP code from email
- [ ] Update password with reset token
- [ ] Test invalid OTP code handling
- [ ] Test expired token handling
- [ ] Test resend OTP functionality
- [ ] Test rate limiting (429 errors)
- [ ] Test navigation flow between screens
- [ ] Test back navigation
- [ ] Test error recovery

## Notes

- **OTP Expiry**: OTP codes expire after 1 hour
- **Reset Token Expiry**: Reset tokens expire after 10 minutes
- **Single Use**: Both OTP codes and reset tokens are single-use
- **Session Invalidation**: All user sessions are invalidated after password reset
- **No Redirect URLs**: Deep links are no longer needed

## Breaking Changes

⚠️ **This is a breaking change** - the old password reset flow will no longer work.

If you have any existing password reset links or deep links, they will need to be updated to use the new OTP flow.

## Support

If you encounter any issues:
1. Ensure you're using `onecrew-api-client@^2.11.0`
2. Verify Supabase email template includes `{{ .Token }}` for OTP code
3. Check that OTP code is exactly 6 digits
4. Ensure reset token is used within 10 minutes

---

**Migration Date**: 2025-01-27  
**API Client Version**: 2.11.0  
**Status**: ✅ Complete










