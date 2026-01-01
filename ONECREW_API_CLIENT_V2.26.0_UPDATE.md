# OneCrew API Client Update Summary (v2.24.6 → v2.26.0)

## Update Status
✅ **Code updated and ready for v2.26.0**
⏳ **Waiting for v2.26.0 to be published to npm**

## Package Information
- **Target Version**: v2.26.0
- **Current Version**: v2.24.6
- **Repository**: https://github.com/onecrew/onecrew-api-client
- **Status**: Version not yet published (as of update date)

## Overview

This release adds official Apple OAuth support using Supabase authentication. The new `signInWithApple()` method provides a cleaner API for Apple authentication compared to direct fetch calls.

## Key Changes in v2.26.0

### ✨ New Feature: Apple OAuth Support

**What's New:**
- New method `api.auth.signInWithApple(accessToken, category?, primary_role?)` for Apple authentication
- Uses Supabase OAuth authentication (same flow as Google OAuth)
- Comprehensive JSDoc documentation with usage examples
- Client must use Supabase's `signInWithOAuth()` or `signInWithIdToken()` to authenticate with Apple first

**TypeScript Signature:**
```typescript
signInWithApple(
  accessToken: string,
  category?: 'crew' | 'talent' | 'company',
  primary_role?: string
): Promise<ApiResponse<AuthResponse>>
```

**Usage Example:**
```typescript
// 1. Sign in with Supabase (using expo-apple-authentication)
const credential = await AppleAuthentication.signInAsync({
  requestedScopes: [
    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    AppleAuthentication.AppleAuthenticationScope.EMAIL,
  ],
});

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const { data, error } = await supabase.auth.signInWithIdToken({
  provider: 'apple',
  token: credential.identityToken,
  nonce: credential.nonce
});

// 2. Get session after OAuth completes
const { data: { session } } = await supabase.auth.getSession();

// 3. Send Supabase access token to backend using API client
await api.auth.signInWithApple(session.access_token, 'crew', 'director');
```

## Code Changes Made

### 1. Updated `package.json`
- Changed version from `^2.24.6` to `^2.26.0`
- Added comment noting the new Apple OAuth support

### 2. Updated `src/contexts/ApiContext.tsx`

**Before (v2.24.6):**
- Used direct `fetch()` call to `/api/auth/apple` endpoint
- Manual response parsing and error handling

**After (v2.26.0):**
- Uses `api.auth.signInWithApple()` method when available
- Falls back to direct fetch for older API client versions (backward compatible)
- Cleaner error handling with proper category detection

**Key Implementation Details:**
- Checks if `api.auth.signInWithApple` method exists before using it
- Falls back gracefully to direct fetch if method not available
- Maintains same error handling for `CATEGORY_REQUIRED` errors
- Preserves all existing functionality (push notifications, user profile fetching, etc.)

## Migration Notes

### What Changed

1. **API Client Method**: New `api.auth.signInWithApple()` method available
2. **Backward Compatibility**: Code includes fallback to direct fetch for older versions
3. **No Breaking Changes**: Existing code continues to work

### Current Implementation

The app already uses Supabase OAuth for Apple authentication via `AppleAuthService.ts`, which:
1. Uses `expo-apple-authentication` to get Apple identity token
2. Exchanges it with Supabase for access token
3. Sends access token to backend

The new API client method simplifies step 3 by using the official API client method instead of direct fetch.

## Next Steps

### When v2.26.0 is Published

1. **Install the new version:**
   ```bash
   npm install onecrew-api-client@2.26.0
   ```

2. **Verify the update:**
   ```bash
   npm list onecrew-api-client
   ```

3. **Test Apple Sign-In:**
   - Test on iOS device (Apple Sign-In doesn't work in simulator)
   - Verify new user flow (category selection)
   - Verify existing user flow (no category needed)
   - Test error handling (cancelled, network errors, etc.)

4. **Remove fallback code (optional):**
   - Once confirmed working, you can remove the direct fetch fallback
   - The code will automatically use the API client method

## Requirements

### Supabase Configuration

- Supabase project with Apple OAuth provider configured
- Apple Developer account and Service ID setup
- See `docs/SUPABASE_APPLE_OAUTH_SETUP.md` in the backend repository for complete setup instructions

### Client Configuration

The app already has:
- ✅ `expo-apple-authentication` package installed
- ✅ `@supabase/supabase-js` package installed
- ✅ `AppleAuthService.ts` implementation
- ✅ Supabase configuration in `app.json` or environment variables

## Testing Recommendations

### General Testing
1. **Verify API calls work normally**: All existing API calls should continue to work
2. **Test Apple Sign-In flow**: Verify the new method works correctly
3. **Test fallback**: Verify fallback to direct fetch works if method not available
4. **Test error handling**: Verify category required errors are handled correctly

### Apple Sign-In Specific Testing
1. **Test on physical iOS device**: Apple Sign-In requires a physical device
2. **Test new user flow**: Verify category selection modal appears
3. **Test existing user flow**: Verify no category needed
4. **Test cancellation**: Verify user cancellation is handled gracefully
5. **Test error scenarios**: Network errors, invalid tokens, etc.

## Related Files

- `package.json` - Updated dependency version
- `src/contexts/ApiContext.tsx` - Updated `appleSignIn()` method to use new API client method
- `src/services/AppleAuthService.ts` - Already implements Supabase OAuth (no changes needed)
- `src/pages/LoginPage.tsx` - Uses `appleSignIn()` from ApiContext (no changes needed)
- `src/pages/SignupPage.tsx` - Uses `appleSignIn()` from ApiContext (no changes needed)

## Benefits

1. **Cleaner Code**: Uses official API client method instead of direct fetch
2. **Better Error Handling**: API client handles errors consistently
3. **Type Safety**: TypeScript types available for the new method
4. **Maintainability**: Easier to maintain with official API client method
5. **Consistency**: Same pattern as Google OAuth (when implemented in API client)

## Notes

- The code is backward compatible and will work with v2.24.6 until v2.26.0 is published
- Once v2.26.0 is published, the code will automatically use the new method
- The fallback ensures no breaking changes during the transition

---

**Last Updated**: 2025-01-20  
**Documentation Version**: 1.0  
**Status**: Ready for v2.26.0 release




