# Backend Rate Limiter Verification Guide

## Summary of Required Changes

### ✅ What Should Be Implemented

1. **Shared store removed, per-limiter stores added**
   - ❌ **Before:** `getRateLimitStore()` returned one shared `RedisStore` (`prefix: 'rl:'`)
   - ✅ **After:** `createRateLimitStore(prefix: string)` creates a **new** `RedisStore` per call

2. **`createRateLimitStore` helper function**
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

3. **Each limiter uses its own store and prefix**

   | Limiter | Prefix |
   |--------|--------|
   | `generalLimiter` | `rl:general:` |
   | `authLimiter` | `rl:auth:` |
   | `passwordResetRequestLimiter` | `rl:password-reset-request:` |
   | `passwordResetOtpLimiter` | `rl:password-reset-otp:` |
   | `passwordResetConfirmLimiter` | `rl:password-reset-confirm:` |

4. **Redis client remains shared**
   - All stores use the same Redis client from `getRedisClient()`
   - Only the `RedisStore` instances are unique per limiter

---

## Verification Steps

### Step 1: Locate Rate Limiter Configuration

Find the file where rate limiters are configured (likely `src/index.ts` or similar).

**Search for:**
```bash
# In backend repository
grep -r "rateLimit\|RedisStore\|getRateLimitStore" src/
```

---

### Step 2: Verify No Shared Store

**Check for:**
- ❌ **BAD:** `const rateLimitStore = getRateLimitStore()` or similar
- ❌ **BAD:** `const store = new RedisStore({ prefix: 'rl:' })` used by multiple limiters
- ✅ **GOOD:** Each limiter creates its own store via `createRateLimitStore(prefix)`

**Example of WRONG code:**
```typescript
// ❌ WRONG - Shared store
const sharedStore = getRateLimitStore();
const generalLimiter = rateLimit({ store: sharedStore, ... });
const authLimiter = rateLimit({ store: sharedStore, ... }); // ERROR!
```

**Example of CORRECT code:**
```typescript
// ✅ CORRECT - Per-limiter stores
const generalLimiter = rateLimit({
  store: createRateLimitStore('rl:general:'),
  ...
});
const authLimiter = rateLimit({
  store: createRateLimitStore('rl:auth:'),
  ...
});
```

---

### Step 3: Verify Helper Function Exists

**Check for:**
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

**Verify:**
- ✅ Function exists
- ✅ Takes `prefix: string` parameter
- ✅ Uses `getRedisClient()` to get shared Redis client
- ✅ Creates new `RedisStore` instance each time
- ✅ Returns `undefined` if Redis client unavailable
- ✅ Has error handling

---

### Step 4: Verify Each Limiter Uses Unique Prefix

**Check each limiter:**

```typescript
// ✅ CORRECT - Each has unique prefix
const generalLimiter = rateLimit({
  store: createRateLimitStore('rl:general:'),
  windowMs: 15 * 60 * 1000,
  max: 100,
});

const authLimiter = rateLimit({
  store: createRateLimitStore('rl:auth:'),
  windowMs: 60 * 60 * 1000,
  max: 5,
});

const passwordResetRequestLimiter = rateLimit({
  store: createRateLimitStore('rl:password-reset-request:'),
  windowMs: 15 * 60 * 1000,
  max: 5,
});

const passwordResetOtpLimiter = rateLimit({
  store: createRateLimitStore('rl:password-reset-otp:'),
  windowMs: 5 * 60 * 1000,
  max: 3,
});

const passwordResetConfirmLimiter = rateLimit({
  store: createRateLimitStore('rl:password-reset-confirm:'),
  windowMs: 15 * 60 * 1000,
  max: 5,
});
```

**Verify:**
- ✅ `generalLimiter` uses `'rl:general:'`
- ✅ `authLimiter` uses `'rl:auth:'`
- ✅ `passwordResetRequestLimiter` uses `'rl:password-reset-request:'`
- ✅ `passwordResetOtpLimiter` uses `'rl:password-reset-otp:'`
- ✅ `passwordResetConfirmLimiter` uses `'rl:password-reset-confirm:'`
- ✅ All prefixes are unique
- ✅ Each limiter calls `createRateLimitStore()` separately

---

### Step 5: Verify Redis Client Sharing

**Check:**
- ✅ All stores use the same Redis client (from `getRedisClient()`)
- ✅ `getRedisClient()` is called inside `createRateLimitStore()`
- ✅ No multiple Redis client instances created

**Example:**
```typescript
// ✅ CORRECT - Shared client
const createRateLimitStore = (prefix: string) => {
  const redisClient = getRedisClient(); // Shared client
  return new RedisStore({ client: redisClient, prefix });
};

// ❌ WRONG - Multiple clients
const redisClient1 = new Redis(...);
const redisClient2 = new Redis(...);
```

---

### Step 6: Verify InitializeRedis Log

**Check startup logs for:**
```typescript
// Should reference getRedisClient(), not rateLimitStore
if (getRedisClient()) {
  console.log('Redis initialized. Rate limiting uses Redis with per-limiter stores.');
}
```

**Verify:**
- ✅ Log mentions `getRedisClient()`
- ✅ Log mentions "per-limiter stores"
- ❌ Should NOT reference `rateLimitStore` (old shared store)

---

### Step 7: Test Build

**Run:**
```bash
npm run build
```

**Verify:**
- ✅ Build completes successfully
- ✅ No TypeScript errors
- ✅ No ValidationError warnings

---

### Step 8: Test Runtime

**Start server and check logs:**

1. **Check for ValidationError:**
   ```bash
   # Should NOT see this error:
   ValidationError: A Store instance must not be shared across multiple rate limiters
   ```

2. **Check Redis connection:**
   ```bash
   # Should see:
   Redis initialized. Rate limiting uses Redis with per-limiter stores.
   ```

3. **Test rate limiting:**
   - Make requests to different endpoints
   - Verify rate limits work independently
   - Check Redis keys (if accessible) for correct prefixes

---

## Code Patterns to Look For

### ✅ CORRECT Patterns

```typescript
// Pattern 1: Helper function
const createRateLimitStore = (prefix: string) => {
  const redisClient = getRedisClient();
  if (!redisClient) return undefined;
  return new RedisStore({ client: redisClient, prefix });
};

// Pattern 2: Each limiter gets its own store
const limiter1 = rateLimit({
  store: createRateLimitStore('rl:limiter1:'),
  ...
});

const limiter2 = rateLimit({
  store: createRateLimitStore('rl:limiter2:'),
  ...
});
```

### ❌ WRONG Patterns

```typescript
// Pattern 1: Shared store
const sharedStore = getRateLimitStore();
const limiter1 = rateLimit({ store: sharedStore, ... });
const limiter2 = rateLimit({ store: sharedStore, ... }); // ERROR!

// Pattern 2: Same store instance reused
const store = new RedisStore({ client: redisClient, prefix: 'rl:' });
const limiter1 = rateLimit({ store, ... });
const limiter2 = rateLimit({ store, ... }); // ERROR!

// Pattern 3: Missing prefix uniqueness
const limiter1 = rateLimit({
  store: createRateLimitStore('rl:'), // Same prefix!
  ...
});
const limiter2 = rateLimit({
  store: createRateLimitStore('rl:'), // Same prefix! ERROR!
  ...
});
```

---

## Quick Verification Checklist

- [ ] No `getRateLimitStore()` function that returns shared store
- [ ] `createRateLimitStore(prefix)` helper function exists
- [ ] Each limiter calls `createRateLimitStore()` with unique prefix
- [ ] All prefixes are different:
  - [ ] `rl:general:`
  - [ ] `rl:auth:`
  - [ ] `rl:password-reset-request:`
  - [ ] `rl:password-reset-otp:`
  - [ ] `rl:password-reset-confirm:`
- [ ] Redis client is shared (from `getRedisClient()`)
- [ ] `npm run build` succeeds
- [ ] No ValidationError in logs
- [ ] Rate limiting works correctly
- [ ] InitializeRedis log mentions per-limiter stores

---

## Expected Behavior After Fix

1. **No ValidationError:** Server starts without rate limiter errors
2. **Independent Rate Limits:** Each endpoint has its own rate limit counter
3. **Redis Keys:** Keys in Redis use correct prefixes (`rl:general:`, `rl:auth:`, etc.)
4. **Build Success:** TypeScript compilation succeeds
5. **Logs:** Startup logs confirm Redis initialization with per-limiter stores

---

## Troubleshooting

### Issue: Still Getting ValidationError

**Check:**
1. Are all limiters using `createRateLimitStore()`?
2. Are all prefixes unique?
3. Is any limiter reusing a store instance?
4. Are there any other rate limiters not updated?

**Solution:**
- Ensure every limiter calls `createRateLimitStore()` separately
- Verify all prefixes are unique
- Check for any missed limiters

### Issue: Rate Limiting Not Working

**Check:**
1. Is Redis client initialized?
2. Are stores being created successfully?
3. Are limiters applied to correct routes?

**Solution:**
- Verify Redis connection
- Check error logs for store creation failures
- Verify route middleware configuration

### Issue: Build Fails

**Check:**
1. TypeScript errors?
2. Missing imports?
3. Type mismatches?

**Solution:**
- Fix TypeScript errors
- Ensure all imports are correct
- Verify RedisStore type compatibility

---

## Summary

The fix requires:
1. ✅ Remove shared store pattern
2. ✅ Add `createRateLimitStore(prefix)` helper
3. ✅ Use unique prefix for each limiter
4. ✅ Keep Redis client shared
5. ✅ Update initialization logs

This resolves the `ValidationError` while maintaining proper rate limiting functionality.
