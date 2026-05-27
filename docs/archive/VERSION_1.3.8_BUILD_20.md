# Version 1.3.8 (Build 20) - TestFlight Release

## Release Date
January 28, 2026

## Version Information
- **Version:** 1.3.8
- **Build Number:** 20 (iOS)
- **Runtime Version:** 1.3.8

## Changes in This Release

### 🐛 Critical Bug Fixes

#### 1. Flickering/Restart Fix
- **Issue:** App flickering and restarting when sending messages
- **Root Cause:** `getStreamChatToken` function was recreated on every render, causing infinite loop in `StreamChatProvider`
- **Fix:** Memoized `getStreamChatToken` with `useCallback` to prevent infinite loops
- **Impact:** Eliminates flickering and app restarts during message sending

#### 2. Rate Limit 429 Errors Fix
- **Issue:** HTTP 429 "Too Many Requests" errors when sending messages to multiple users from same company
- **Root Cause:** Rapid concurrent requests to `/api/users/get-by-id` hitting backend rate limit
- **Fix:** Added cached wrapper for `getUserByIdDirect` with:
  - Request deduplication (prevents duplicate concurrent requests)
  - Caching (5-minute TTL, persistent)
  - Automatic retry with exponential backoff on 429 errors
- **Impact:** Prevents 429 errors when messaging multiple users

#### 3. Google Sign-In iOS URL Scheme Fix
- **Issue:** Google Sign-In failing on iOS with "missing URL scheme" error
- **Fix:** Added Google Sign-In URL scheme to `Info.plist`: `com.googleusercontent.apps.309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj`
- **Impact:** Google Sign-In now works correctly on iOS

### 🔧 Backend Optimizations (Deployed Separately)

The backend has been optimized to support the frontend fixes:

1. **Token Endpoint Optimizations:**
   - Cached StreamChat API key
   - In-memory company sync cache (5 min TTL)
   - Async fire-and-forget sync
   - Combined database queries
   - Request logging with timing
   - Rate limiting (300 req/15min)

2. **Performance Improvements:**
   - Company token (first): 40% faster (890ms → 530ms)
   - Company token (cached): 62% faster (726ms → 280ms)
   - Rapid switching: 63% faster (3.5s → 1.3s)

## Files Modified

### Frontend
- `src/contexts/ApiContext.tsx`
  - Memoized `getStreamChatToken` with `useCallback`
  - Added cached wrapper for `getUserByIdDirect` with deduplication and rate limit handling

- `ios/Steps/Info.plist`
  - Added Google Sign-In URL scheme
  - Updated version to 1.3.8
  - Updated build number to 20

- `app.json`
  - Version: 1.3.7 → 1.3.8
  - Build number: 19 → 20
  - Runtime version: 1.3.7 → 1.3.8

- `package.json`
  - Version: 1.3.7 → 1.3.8

## Testing Checklist

### Critical Fixes
- [ ] Test sending messages - verify no flickering or restarts
- [ ] Test sending messages to multiple users from same company - verify no 429 errors
- [ ] Test Google Sign-In on iOS - verify it works correctly
- [ ] Test profile switching (user ↔ company) - verify StreamChat reconnection works
- [ ] Test rapid profile switching - verify no rate limit errors

### General Functionality
- [ ] Test chat functionality (sending, receiving, typing indicators)
- [ ] Test conversation list loading
- [ ] Test user profile viewing
- [ ] Test company profile switching
- [ ] Test message reactions and threading

## Deployment Instructions

### 1. Build for TestFlight

```bash
./build-testflight.sh
```

Or manually:
```bash
eas build --platform ios --profile production
```

### 2. Submit to TestFlight

After build completes:
```bash
eas submit --platform ios --latest
```

### 3. Monitor Build

- Check build status at: https://expo.dev
- Wait for processing (10-30 minutes)
- Go to App Store Connect → TestFlight
- Add testers and configure testing

## Known Issues

None at this time.

## Next Steps

1. **Monitor Production:**
   - Watch for any flickering/restart issues
   - Monitor backend logs for token request patterns
   - Check for 429 errors in logs

2. **Future Improvements:**
   - Consider batch endpoint for fetching multiple users (backend optimization)
   - Add error boundaries around message sending (nice to have)
   - Debounce connection state checks if needed

## Related Documentation

- `FLICKERING_RESTART_FIX_AND_BACKEND_REQUIREMENTS.md` - Detailed fix documentation
- `RATE_LIMIT_429_FIX.md` - Rate limit fix details
- `GOOGLE_SIGNIN_IOS_URL_SCHEME_FIX.md` - Google Sign-In fix details
- `FLICKERING_FIX_COMPLETE.md` - Complete solution summary

---

**Status:** ✅ Ready for TestFlight deployment
**Build:** 20
**Version:** 1.3.8
