# Backend Rate Limiter Fix & User/Company ID Fetching Explanation

## Part 1: Backend Rate Limiter Fix

### Error
```
ValidationError: A Store instance must not be shared across multiple rate limiters. 
Create a new instance of RedisStore (with a unique prefix) for each limiter instead.
```

### Root Cause
The backend is reusing a single `RedisStore` instance across multiple rate limiters. Each rate limiter must have its own `RedisStore` instance with a unique prefix.

### Fix Required

**File:** Backend `src/index.ts` or wherever rate limiters are configured

**❌ WRONG:**
```javascript
const RedisStore = require('rate-limit-redis');
const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');

const redisClient = new Redis(process.env.REDIS_URL);
const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'rl:'
});

// ❌ Both use same store instance
const apiLimiter = rateLimit({ store: redisStore, ... });
const loginLimiter = rateLimit({ store: redisStore, ... }); // ❌ ERROR!
```

**✅ CORRECT:**
```javascript
const RedisStore = require('rate-limit-redis');
const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');

// Single Redis client (can be shared)
const redisClient = new Redis(process.env.REDIS_URL);

// ✅ Each limiter gets its own RedisStore with unique prefix
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:api:' // Unique prefix
  }),
  windowMs: 15 * 60 * 1000,
  max: 100,
});

const loginLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:login:' // Unique prefix
  }),
  windowMs: 60 * 60 * 1000,
  max: 5,
});

const tokenLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:token:' // Unique prefix
  }),
  windowMs: 15 * 60 * 1000,
  max: 300,
});
```

### Helper Function (Recommended)

```javascript
const RedisStore = require('rate-limit-redis');
const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');

const redisClient = new Redis(process.env.REDIS_URL);

// Helper to create rate limiters with unique stores
const createRateLimiter = (options) => {
  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: options.prefix, // Must be unique!
    }),
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || 'Too many requests, please try again later.',
  });
};

// Create limiters
const apiLimiter = createRateLimiter({
  prefix: 'rl:api:',
  windowMs: 15 * 60 * 1000,
  max: 100,
});

const loginLimiter = createRateLimiter({
  prefix: 'rl:login:',
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.',
});

const tokenLimiter = createRateLimiter({
  prefix: 'rl:token:',
  windowMs: 15 * 60 * 1000,
  max: 300,
});

// Apply to routes
app.use('/api/', apiLimiter);
app.post('/api/auth/signin', loginLimiter);
app.post('/api/chat/token', tokenLimiter);
```

### Deployment Steps

1. **Fix the code** in backend repository
2. **Test locally** to ensure no errors
3. **Commit and push** to staging branch
4. **Deploy** to Cloud Run
5. **Monitor logs** to confirm error is resolved

### Rollback (If Needed)

```bash
gcloud run services update-traffic onecrew-backend-staging \
  --to-revisions=onecrew-backend-staging-00049-dgt=100 \
  --region us-central1 \
  --project steps-479623
```

---

## Part 2: Why We Need to Fetch User/Company ID Repeatedly

### Question
"Why do we need to always fetch userID/companyID? Is it being fetched on user login once?"

### Answer: Yes, but context changes

#### What Happens on Login

1. **User Data is Stored:**
   ```typescript
   // On login (ApiContext.tsx line ~955):
   setUser(userData); // Stores user in React state
   setIsAuthenticated(true);
   
   // Also stored in AsyncStorage via setAuthData
   await (api as any).auth.setAuthData({
     token: token,
     user: userData // Includes user.id
   });
   ```

2. **User ID is Available:**
   - Stored in `user.id` (React state)
   - Stored in AsyncStorage
   - Available throughout the app

#### Why We Still Fetch It

**The issue is not fetching the logged-in user's ID - it's about StreamChat user ID format which depends on profile context:**

### StreamChat User ID Format

StreamChat requires different user IDs based on **profile context**:

1. **User Profile:**
   - StreamChat User ID: `onecrew_user_{userId}`
   - Example: `onecrew_user_06851aee-9f94-4673-94c5-f1f436f979c3`

2. **Company Profile:**
   - StreamChat User ID: `onecrew_company_{companyId}`
   - Example: `onecrew_company_fe045b7c-b310-4295-87e1-d5ceca66e55d`

### Why We Fetch Token on Profile Switch

When switching profiles:

1. **User → Company:**
   - Need to verify user is a member of the company
   - Need to generate token for `onecrew_company_{companyId}` format
   - Need to disconnect from `onecrew_user_{userId}` and connect to `onecrew_company_{companyId}`

2. **Company → User:**
   - Need to switch back to `onecrew_user_{userId}` format
   - Need to disconnect from company and reconnect as user

### Token Endpoint Requirements

The `/api/chat/token` endpoint needs:

```typescript
// Request
POST /api/chat/token?profile_type=company&company_id={companyId}
Headers: Authorization: Bearer {jwt_token}

// Backend must:
1. Extract user ID from JWT token (already have this)
2. Verify user is member of company (needs company_id from query)
3. Generate StreamChat token for: onecrew_company_{companyId}
4. Return token + formatted user_id
```

### Why Not Cache the Token?

**We can't cache tokens because:**

1. **Profile Context Changes:**
   - User profile token ≠ Company profile token
   - Each company needs its own token
   - Tokens are profile-specific, not user-specific

2. **Security:**
   - Tokens expire
   - Company membership can change
   - Need fresh verification on each request

3. **StreamChat Requirements:**
   - Must disconnect/reconnect when switching profiles
   - Each profile has different StreamChat user ID
   - Can't reuse tokens across profiles

### What We Actually Cache

**We DO cache:**
- ✅ User data (fetched once on login)
- ✅ Company list (fetched once, cached)
- ✅ User details (cached for 5 minutes)
- ✅ Company details (cached)

**We DON'T cache:**
- ❌ StreamChat tokens (profile-specific, need fresh verification)
- ❌ Company membership verification (can change)

### Optimization: What We Fixed

**Before (Problem):**
- Fetching user details repeatedly → 429 errors
- No deduplication → multiple requests for same user

**After (Fixed):**
- ✅ Request deduplication (one request per user at a time)
- ✅ Caching user details (5-minute TTL)
- ✅ Still fetch tokens (but optimized with caching on backend)

### Summary

| Item | Fetched on Login? | Why Fetch Again? |
|------|-------------------|------------------|
| **User ID** | ✅ Yes | ❌ Don't need to - already have it |
| **User Data** | ✅ Yes | ✅ Only if viewing other users' profiles |
| **Company ID** | ✅ Yes (list) | ✅ Need specific company ID when switching |
| **StreamChat Token** | ✅ Yes (user) | ✅ Need new token for each profile context |
| **Company Membership** | ❌ No | ✅ Must verify on each token request |

### The Real Issue

The repeated fetching you're seeing is likely:
1. **Fetching OTHER users' data** (when viewing profiles, messaging, etc.)
2. **Fetching tokens** (necessary for profile switching)
3. **NOT fetching logged-in user's ID** (already have it)

The 429 errors were caused by fetching **other users' details** too rapidly, which we've now fixed with caching and deduplication.

---

## Next Steps

1. **Backend:** Fix rate limiter RedisStore sharing issue
2. **Backend:** Deploy fix to staging
3. **Frontend:** Already fixed (caching + deduplication)
4. **Monitor:** Watch for 429 errors after backend fix
