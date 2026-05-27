# Backend Rate Limiter Fix - RedisStore Sharing Issue

## Error

```
ValidationError: A Store instance must not be shared across multiple rate limiters. 
Create a new instance of RedisStore (with a unique prefix) for each limiter instead.
```

## Root Cause

The backend is reusing a single `RedisStore` instance across multiple rate limiters. Each rate limiter must have its own `RedisStore` instance with a unique prefix.

## Fix Required

### File: Backend `src/index.ts` or wherever rate limiters are configured

**❌ WRONG (Current Code):**
```javascript
const RedisStore = require('rate-limit-redis');
const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');

// ❌ WRONG: Creating one RedisStore and reusing it
const redisClient = new Redis(process.env.REDIS_URL);
const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'rl:'
});

// ❌ WRONG: Both limiters use the same store instance
const apiLimiter = rateLimit({
  store: redisStore, // Same instance!
  windowMs: 15 * 60 * 1000,
  max: 100,
});

const loginLimiter = rateLimit({
  store: redisStore, // Same instance! ❌
  windowMs: 60 * 60 * 1000,
  max: 5,
});
```

**✅ CORRECT (Fixed Code):**
```javascript
const RedisStore = require('rate-limit-redis');
const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');

// ✅ CORRECT: Create one Redis client (can be shared)
const redisClient = new Redis(process.env.REDIS_URL);

// ✅ CORRECT: Create separate RedisStore instances with unique prefixes
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient, // Same client is OK
    prefix: 'rl:api:' // Unique prefix
  }),
  windowMs: 15 * 60 * 1000,
  max: 100,
});

const loginLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient, // Same client is OK
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

## Key Points

1. **Redis Client:** Can be shared (one connection pool)
2. **RedisStore:** Must be unique per rate limiter (new instance each time)
3. **Prefix:** Must be unique for each store instance

## Complete Example

```javascript
const RedisStore = require('rate-limit-redis');
const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');

// Single Redis client (shared)
const redisClient = new Redis(process.env.REDIS_URL);

// Helper function to create rate limiters
const createRateLimiter = (options) => {
  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: options.prefix, // Unique prefix required
    }),
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || 'Too many requests, please try again later.',
  });
};

// Create limiters with unique prefixes
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

## Deployment Steps

1. **Fix the code** in your backend repository
2. **Test locally** to ensure no errors
3. **Commit and push** to staging branch
4. **Deploy** to Cloud Run
5. **Monitor logs** to confirm error is resolved

## Rollback Option

If you need immediate service restoration:

```bash
gcloud run services update-traffic onecrew-backend-staging \
  --to-revisions=onecrew-backend-staging-00049-dgt=100 \
  --region us-central1 \
  --project steps-479623
```

This will route 100% of traffic back to the previous healthy revision while you fix the code.
