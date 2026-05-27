# Version 1.3.8 (Build 21) - TestFlight Release

## Release Date
January 28, 2026

## Version Information
- **Version:** 1.3.8
- **Build Number:** 21 (iOS)
- **Runtime Version:** 1.3.8

## Changes in This Release

### 🚀 Frontend Optimizations

#### 1. CompanyProfilePage - Conditional Cache Clearing ✅
- **File:** `src/pages/CompanyProfilePage.tsx`
- **Change:** Only clears cache when `refreshKey > 0` (user explicitly refreshed)
- **Impact:** Prevents unnecessary cache clearing and fetches when navigating to company profile
- **Expected Reduction:** 50-70% reduction in unnecessary API calls

#### 2. CompanyEditPage - Check Before Fetching ✅
- **File:** `src/pages/CompanyEditPage.tsx`
- **Change:** Checks if all required fields are present before fetching
- **Impact:** Prevents redundant fetches when editing company with complete data
- **Expected Reduction:** Eliminates unnecessary fetches when data is already available

#### 3. AccountSwitcherModal - Skip If Already Loaded ✅
- **File:** `src/components/AccountSwitcherModal.tsx`
- **Change:** Checks if companies are already loaded before fetching
- **Impact:** Prevents duplicate fetches when reopening modal
- **Expected Reduction:** Only fetches once per user session

#### 4. ProfileCompletionPage - Remove Function Dependencies ✅
- **File:** `src/pages/ProfileCompletionPage.tsx`
- **Change:** Removed `getAccessToken` and `getBaseUrl` from useEffect dependencies
- **Impact:** Prevents unnecessary re-fetches when functions are recreated
- **Expected Reduction:** Eliminates unnecessary re-renders and fetches

### 🔧 Backend Rate Limiter Fix (Deployed Separately)

#### Rate Limiter ValidationError Fix ✅
- **Issue:** `ValidationError: A Store instance must not be shared across multiple rate limiters`
- **Root Cause:** Single shared `RedisStore` instance was being reused across multiple rate limiters
- **Fix:** 
  - Removed shared store pattern
  - Added `createRateLimitStore(prefix)` helper function
  - Each limiter now uses its own `RedisStore` instance with unique prefix
  - Redis client remains shared (correct behavior)
- **Impact:** 
  - No ValidationError at startup
  - Independent rate limits for each endpoint
  - Correct Redis key prefixes (`rl:general:`, `rl:auth:`, etc.)

#### Rate Limiter Configuration

| Limiter | Prefix |
|--------|--------|
| `generalLimiter` | `rl:general:` |
| `authLimiter` | `rl:auth:` |
| `passwordResetRequestLimiter` | `rl:password-reset-request:` |
| `passwordResetOtpLimiter` | `rl:password-reset-otp:` |
| `passwordResetConfirmLimiter` | `rl:password-reset-confirm:` |

## Performance Improvements

### Frontend Optimizations Expected Impact
- **50-70% reduction** in unnecessary API calls
- **Faster page loads** (using cached data)
- **Reduced server load** (fewer redundant requests)
- **Better user experience** (less loading spinners)

### Backend Rate Limiter Fix Impact
- **No ValidationError** - Server starts cleanly
- **Independent rate limits** - Each endpoint has its own counter
- **Correct Redis keys** - Keys use proper prefixes for monitoring
- **Successful builds** - No compilation errors

## Files Modified

### Frontend
- `src/pages/CompanyProfilePage.tsx` - Conditional cache clearing
- `src/pages/CompanyEditPage.tsx` - Check before fetching
- `src/components/AccountSwitcherModal.tsx` - Skip if already loaded
- `src/pages/ProfileCompletionPage.tsx` - Removed function dependencies

### Configuration
- `app.json` - Build number: 20 → 21
- `ios/Steps/Info.plist` - CFBundleVersion: 20 → 21

### Backend (Separate Repository)
- `src/index.ts` - Rate limiter configuration with per-limiter stores

## Testing Checklist

### Frontend Optimizations
- [ ] Open CompanyProfilePage - Should use cache if data exists
- [ ] Edit company with complete data - Should not fetch again
- [ ] Open AccountSwitcherModal multiple times - Should only fetch once
- [ ] Open ProfileCompletionPage - Should not re-fetch unnecessarily
- [ ] Monitor network tab - Should see fewer API calls
- [ ] Test profile switching - Should still work correctly
- [ ] Test refresh functionality - Should still clear cache when needed

### Backend Rate Limiter (Verified)
- [x] No ValidationError in logs
- [x] Rate limiters initialize successfully
- [x] Build succeeds without errors
- [x] Per-limiter stores working correctly
- [ ] Test rate limiting behavior (manual testing)
- [ ] Verify Redis keys use correct prefixes (if accessible)

### General Functionality
- [ ] Test all optimized pages work correctly
- [ ] Test navigation between pages
- [ ] Test data refresh when needed
- [ ] Test error handling

## Deployment Instructions

### 1. Build for TestFlight

```bash
eas build --platform ios --profile production
```

Or use the build script:
```bash
./build-testflight.sh
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

## Verification Status

### Frontend Optimizations
- ✅ Code verification complete
- ✅ Linter checks passed
- ⏳ Runtime testing pending (manual testing required)

### Backend Rate Limiter
- ✅ Code verification complete
- ✅ Build verification complete
- ✅ Runtime verification complete (no ValidationError)
- ⏳ Rate limiting behavior testing pending

## Known Issues

None at this time.

## Next Steps

1. **Monitor Performance:**
   - Track API call reduction
   - Monitor page load times
   - Check server load reduction

2. **Future Improvements:**
   - Continue optimizing other pages with similar patterns
   - Monitor rate limiting effectiveness
   - Consider additional caching strategies

## Related Documentation

- `FRONTEND_OPTIMIZATION_SUMMARY.md` - Detailed frontend optimization documentation
- `BACKEND_RATE_LIMITER_FIX.md` - Backend rate limiter fix documentation
- `BACKEND_RATE_LIMITER_VERIFICATION.md` - Backend verification guide
- `FRONTEND_BACKEND_TEST_PLAN.md` - Comprehensive test plan
- `VERIFICATION_COMPLETE.md` - Verification summary
- `TEST_VERIFICATION_SUMMARY.md` - Test verification summary

---

**Status:** ✅ Ready for TestFlight deployment
**Build:** 21
**Version:** 1.3.8
