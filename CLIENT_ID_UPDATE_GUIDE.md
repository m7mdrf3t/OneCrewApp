# Client ID Update Guide

## Do I Need to Update Client ID in Code?

### Short Answer: **NO** (for Supabase OAuth)

If you changed the Client ID in **Supabase Dashboard**, you **DO NOT** need to change it in the code. Supabase automatically uses whatever Client ID you configure in the Dashboard.

### Current OAuth Flow

The app uses **Supabase OAuth** which:
- ✅ Gets the Client ID from Supabase Dashboard configuration
- ✅ Uses whatever Client ID you set in: **Supabase Dashboard → Authentication → Providers → Google**
- ✅ Does NOT use the Client IDs defined in `GoogleAuthService.ts`

### Client IDs in Code

The Client IDs in `src/services/GoogleAuthService.ts` are:
- **Only used for the native Google Sign-In SDK** (fallback method, not currently used)
- **Not used by the main Supabase OAuth flow**
- **Optional to update** - only if you want the native SDK fallback to work

## When to Update Code Client IDs

### Update if:
1. You want the **native Google Sign-In SDK fallback** to use the new Client ID
2. You're switching back to native SDK instead of Supabase OAuth
3. Your backend API requires a specific Client ID for verification

### Don't update if:
1. ✅ You only changed the Client ID in Supabase Dashboard
2. ✅ You're using Supabase OAuth (current implementation)
3. ✅ You don't need the native SDK fallback

## How to Update (If Needed)

If you want to update the Client IDs in the code:

1. Open `src/services/GoogleAuthService.ts`
2. Find these constants:
   ```typescript
   const WEB_CLIENT_ID = 'YOUR_OLD_CLIENT_ID';
   const IOS_CLIENT_ID = 'YOUR_OLD_CLIENT_ID';
   const ANDROID_CLIENT_ID = 'YOUR_OLD_CLIENT_ID';
   ```
3. Replace with your new Client IDs:
   ```typescript
   const WEB_CLIENT_ID = 'YOUR_NEW_CLIENT_ID';
   const IOS_CLIENT_ID = 'YOUR_NEW_CLIENT_ID';
   const ANDROID_CLIENT_ID = 'YOUR_NEW_CLIENT_ID';
   ```

## Important Notes

- **Supabase OAuth** (current method) → Uses Client ID from Supabase Dashboard ✅
- **Native SDK** (fallback) → Uses Client IDs from code
- Changing Client ID in Supabase Dashboard is enough for the main OAuth flow
- Code Client IDs are only for the native SDK fallback

## Verification

To verify which Client ID is being used:

1. **Check Supabase Dashboard**:
   - Go to Authentication → Providers → Google
   - See the Client ID configured there
   - This is what Supabase OAuth uses

2. **Check Console Logs**:
   - When signing in, look for: `🌐 OAuth URL received from Supabase:`
   - The URL will contain the Client ID that Supabase is using
   - This should match what's in Supabase Dashboard

3. **Check Code** (only for native SDK):
   - Look at `WEB_CLIENT_ID`, `IOS_CLIENT_ID`, `ANDROID_CLIENT_ID` in `GoogleAuthService.ts`
   - These are only used if native SDK is used (currently not the main method)

## Summary

**For Supabase OAuth (current implementation):**
- ✅ Change Client ID in **Supabase Dashboard** → Done!
- ❌ Don't need to change it in code

**For Native SDK (fallback):**
- ✅ Change Client ID in **Supabase Dashboard**
- ✅ Optionally change in code if you want fallback to work



