# Frontend Optimization & Backend Rate Limiter Test Plan

## Frontend Optimizations Testing

### ✅ Verification Status

All frontend optimizations are correctly implemented:

1. **CompanyProfilePage** ✅
   - Location: `src/pages/CompanyProfilePage.tsx:171`
   - Implementation: Only clears cache when `refreshKey > 0`
   - Code: `if (refreshKey > 0) { await rateLimiter.clearCacheByPattern(...) }`

2. **CompanyEditPage** ✅
   - Location: `src/pages/CompanyEditPage.tsx:195-231`
   - Implementation: Checks if all required fields are present before fetching
   - Code: `const hasAllFields = requiredFields.every(...)` → skips fetch if true

3. **AccountSwitcherModal** ✅
   - Location: `src/components/AccountSwitcherModal.tsx:62-83`
   - Implementation: Only fetches if companies list is empty
   - Code: `if (companies.length === 0) { loadCompanies(); }`

4. **ProfileCompletionPage** ✅
   - Location: `src/pages/ProfileCompletionPage.tsx:594-596`
   - Implementation: Removed `getAccessToken` and `getBaseUrl` from useEffect dependencies
   - Code: Dependencies only include actual data changes, not functions

---

## Frontend Test Checklist

### Test 1: CompanyProfilePage Cache Behavior
- [ ] Navigate to a company profile page
- [ ] Check network tab - should see initial fetch
- [ ] Navigate away and back (without refresh)
- [ ] Check network tab - should NOT see another fetch (using cache)
- [ ] Pull to refresh (triggers refreshKey increment)
- [ ] Check network tab - should see fetch AND cache cleared
- [ ] Verify console log: `🧹 [CompanyProfile] Cleared cache due to refreshKey change`

**Expected Result:** Cache is only cleared on explicit refresh, not on every navigation.

---

### Test 2: CompanyEditPage Conditional Fetch
- [ ] Navigate to company edit page with complete company data
- [ ] Check network tab - should NOT see `getCompany` call
- [ ] Check console - should see: `✅ [CompanyEditPage] Company data already complete, skipping fetch`
- [ ] Navigate to company edit page with incomplete company data
- [ ] Check network tab - should see `getCompany` call
- [ ] Check console - should see: `🔍 [CompanyEditPage] Missing required fields, fetching company data...`

**Expected Result:** Only fetches when required fields are missing.

---

### Test 3: AccountSwitcherModal Skip Duplicate Fetches
- [ ] Open account switcher modal (first time)
- [ ] Check network tab - should see `getUserCompanies` call
- [ ] Close modal
- [ ] Open account switcher modal again (second time)
- [ ] Check network tab - should NOT see another `getUserCompanies` call
- [ ] Check console - should see: `✅ [AccountSwitcherModal] Companies already loaded, skipping fetch`
- [ ] Switch to a different user account
- [ ] Open account switcher modal
- [ ] Check network tab - should see `getUserCompanies` call (user changed)
- [ ] Check console - should see: `🔄 [AccountSwitcherModal] User changed, reloading companies...`

**Expected Result:** Only fetches when companies list is empty or user changed.

---

### Test 4: ProfileCompletionPage Dependency Optimization
- [ ] Open profile completion page
- [ ] Check network tab - note initial fetch count
- [ ] Trigger a re-render (e.g., change a form field)
- [ ] Check network tab - should NOT see additional fetches
- [ ] Change actual user data (e.g., user ID changes)
- [ ] Check network tab - should see fetch triggered

**Expected Result:** useEffect only runs when actual data changes, not when functions are recreated.

---

## Backend Rate Limiter Verification

### Required Backend Changes

The backend must implement the following changes:

#### 1. Remove Shared Store
- ❌ **Before:** Single `getRateLimitStore()` returning shared `RedisStore` with `prefix: 'rl:'`
- ✅ **After:** `createRateLimitStore(prefix: string)` creates new `RedisStore` per call

#### 2. Helper Function Implementation

```typescript
const createRateLimitStore = (prefix: string): RedisStore | undefined => {
  const redisClient = getRedisClient();
  if (!redisClient) return undefined;
  try {
    return new RedisStore({
      sendCommand: async (command: string, ...args: string[]) => {
        return await redisClient.call(command, ...args) as Promise<any>;
      },
      prefix,
    });
  } catch (error) {
    console.warn(`Failed to create Redis store for rate limiting (${prefix}), using in-memory:`, error);
    return undefined;
  }
};
```

#### 3. Per-Limiter Stores with Unique Prefixes

| Limiter | Prefix | Expected Behavior |
|---------|--------|-------------------|
| `generalLimiter` | `rl:general:` | New RedisStore instance |
| `authLimiter` | `rl:auth:` | New RedisStore instance |
| `passwordResetRequestLimiter` | `rl:password-reset-request:` | New RedisStore instance |
| `passwordResetOtpLimiter` | `rl:password-reset-otp:` | New RedisStore instance |
| `passwordResetConfirmLimiter` | `rl:password-reset-confirm:` | New RedisStore instance |

#### 4. Redis Client Sharing
- ✅ Redis client from `getRedisClient()` is still shared (correct)
- ✅ Each limiter gets its own `RedisStore` instance (correct)
- ✅ Each store has a unique prefix (correct)

---

## Backend Test Checklist

### Test 1: Verify No ValidationError
- [ ] Start backend server
- [ ] Check logs for `ValidationError: A Store instance must not be shared`
- [ ] Should NOT see this error
- [ ] All rate limiters should initialize successfully

**Expected Result:** No ValidationError in logs.

---

### Test 2: Verify Per-Limiter Stores
- [ ] Check backend code for rate limiter initialization
- [ ] Verify each limiter uses `createRateLimitStore()` with unique prefix
- [ ] Verify no shared store instances
- [ ] Verify Redis client is shared (from `getRedisClient()`)

**Expected Result:** Each limiter has its own store instance with unique prefix.

---

### Test 3: Verify Redis Prefixes
- [ ] Make requests to different endpoints:
  - General API endpoint → should use `rl:general:` prefix
  - Auth endpoint → should use `rl:auth:` prefix
  - Password reset request → should use `rl:password-reset-request:` prefix
  - Password reset OTP → should use `rl:password-reset-otp:` prefix
  - Password reset confirm → should use `rl:password-reset-confirm:` prefix
- [ ] Check Redis keys (if accessible)
- [ ] Verify keys use correct prefixes

**Expected Result:** Redis keys match expected prefixes for each limiter.

---

### Test 4: Verify Rate Limiting Still Works
- [ ] Test general API rate limiting (should limit after threshold)
- [ ] Test auth rate limiting (should limit login attempts)
- [ ] Test password reset rate limiting (should limit reset requests)
- [ ] Verify limits are independent (hitting one limit doesn't affect others)

**Expected Result:** Rate limiting works correctly for all limiters independently.

---

### Test 5: Verify Build Success
- [ ] Run `npm run build` in backend
- [ ] Should complete successfully
- [ ] No TypeScript errors related to rate limiters

**Expected Result:** Build completes without errors.

---

### Test 6: Verify Redis Initialization Log
- [ ] Check backend startup logs
- [ ] Should see log about Redis initialization
- [ ] Should mention rate limiting uses Redis with per-limiter stores
- [ ] Should reference `getRedisClient()` (not `rateLimitStore`)

**Expected Result:** Log confirms Redis initialization and per-limiter stores.

---

## Integration Testing

### Test 1: Frontend + Backend Integration
- [ ] Start backend with fixed rate limiters
- [ ] Start frontend app
- [ ] Navigate through app normally
- [ ] Monitor network requests
- [ ] Verify:
  - Frontend optimizations reduce unnecessary requests
  - Backend rate limiting works correctly
  - No ValidationError in backend logs
  - No 429 errors for normal usage

**Expected Result:** Both frontend and backend work correctly together.

---

### Test 2: Rate Limit Behavior
- [ ] Make rapid requests to trigger rate limits
- [ ] Verify 429 responses are returned correctly
- [ ] Verify rate limit headers are present
- [ ] Verify different endpoints have independent limits

**Expected Result:** Rate limiting works as expected with per-limiter stores.

---

## Performance Metrics

### Before Optimizations
- CompanyProfilePage: Fetches on every visit
- CompanyEditPage: Always fetches on mount
- AccountSwitcherModal: Fetches every time modal opens
- ProfileCompletionPage: May re-fetch unnecessarily

### After Optimizations (Expected)
- CompanyProfilePage: Only fetches if cache expired or user refreshed
- CompanyEditPage: Only fetches if data is missing
- AccountSwitcherModal: Only fetches if companies not loaded
- ProfileCompletionPage: Only fetches when actual data changes

### Expected Reduction
- **50-70% reduction** in unnecessary API calls
- **Faster page loads** (using cached data)
- **Reduced server load** (fewer redundant requests)
- **Better user experience** (less loading spinners)

---

## Monitoring

### Frontend Monitoring
- Monitor network tab for API call frequency
- Check console logs for optimization messages
- Track page load times

### Backend Monitoring
- Monitor logs for ValidationError (should not appear)
- Monitor Redis key patterns (should match prefixes)
- Monitor rate limit hit rates
- Monitor server response times

---

## Rollback Plan

If issues occur:

### Frontend Rollback
- Revert changes in:
  - `src/pages/CompanyProfilePage.tsx`
  - `src/pages/CompanyEditPage.tsx`
  - `src/components/AccountSwitcherModal.tsx`
  - `src/pages/ProfileCompletionPage.tsx`

### Backend Rollback
- If ValidationError appears, check:
  1. All limiters use `createRateLimitStore()` with unique prefixes
  2. No shared store instances
  3. Redis client is properly initialized
- Rollback to previous revision if needed:
  ```bash
  gcloud run services update-traffic onecrew-backend-staging \
    --to-revisions=onecrew-backend-staging-00049-dgt=100 \
    --region us-central1 \
    --project steps-479623
  ```

---

## Status Summary

- ✅ **Frontend Optimizations:** All implemented correctly
- ⏳ **Backend Rate Limiter:** Needs verification in backend repository
- ⏳ **Integration Testing:** Pending backend verification
- ⏳ **Performance Testing:** Pending full integration

---

## Next Steps

1. ✅ Verify frontend optimizations are implemented (DONE)
2. ⏳ Verify backend rate limiter changes in backend repository
3. ⏳ Run frontend tests
4. ⏳ Run backend tests
5. ⏳ Run integration tests
6. ⏳ Monitor performance metrics
7. ⏳ Deploy to staging
8. ⏳ Monitor production metrics
