# Backend Unread Count Endpoint - Instant Counter Fix

## Problem

The frontend currently needs to fetch ALL conversations to calculate unread count, which is:
- **Slow** - Requires paginating through all conversations
- **Inefficient** - Transfers unnecessary data
- **Delayed** - Takes time to fetch and calculate

## Solution

Create a lightweight backend endpoint that returns ONLY the unread conversation count, without fetching all conversation data.

---

## Backend Implementation

### New Endpoint: `GET /api/chat/conversations/unread-count`

**Purpose:** Return the count of unread conversations for the current profile (user or company)

**Request:**
```typescript
GET /api/chat/conversations/unread-count?profile_type=user
GET /api/chat/conversations/unread-count?profile_type=company&company_id=123
```

**Query Parameters:**
- `profile_type` (required): `'user'` | `'company'`
- `company_id` (optional): Required if `profile_type` is `'company'`

**Response:**
```json
{
  "success": true,
  "data": {
    "unread_count": 1,
    "profile_type": "user",
    "profile_id": "user-123"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Profile type required"
}
```

---

## Backend Code Implementation

### File: `src/routes/chat.ts` (or wherever chat routes are defined)

```typescript
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { db } from '../db'; // Your database connection

const router = Router();

/**
 * GET /api/chat/conversations/unread-count
 * 
 * Returns the count of unread conversations for the current profile.
 * Lightweight endpoint that only counts, doesn't fetch conversation data.
 * 
 * Query params:
 * - profile_type: 'user' | 'company' (required)
 * - company_id: string (required if profile_type is 'company')
 */
router.get('/conversations/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { profile_type, company_id } = req.query;

    // Validate profile_type
    if (!profile_type || (profile_type !== 'user' && profile_type !== 'company')) {
      return res.status(400).json({
        success: false,
        error: 'profile_type is required and must be "user" or "company"'
      });
    }

    // Validate company_id if profile_type is company
    if (profile_type === 'company' && !company_id) {
      return res.status(400).json({
        success: false,
        error: 'company_id is required when profile_type is "company"'
      });
    }

    // Determine the participant ID and type
    const participantId = profile_type === 'company' ? company_id : userId;
    const participantType = profile_type === 'company' ? 'company' : 'user';

    // Query to count unread conversations
    // This is optimized to only count, not fetch full conversation data
    const unreadCountQuery = `
      SELECT COUNT(DISTINCT c.id) as unread_count
      FROM conversations c
      INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
      WHERE cp.participant_id = $1
        AND cp.participant_type = $2
        AND c.last_message_at IS NOT NULL
        AND (
          cp.last_read_at IS NULL 
          OR c.last_message_at > cp.last_read_at
        )
    `;

    const result = await db.query(unreadCountQuery, [participantId, participantType]);
    const unreadCount = parseInt(result.rows[0]?.unread_count || '0', 10);

    return res.json({
      success: true,
      data: {
        unread_count: unreadCount,
        profile_type: profile_type,
        profile_id: participantId
      }
    });
  } catch (error: any) {
    console.error('Error fetching unread conversation count:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch unread conversation count'
    });
  }
});

export default router;
```

---

## Alternative: Using Prisma/ORM

If using Prisma or another ORM:

```typescript
router.get('/conversations/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { profile_type, company_id } = req.query;

    // Validate profile_type
    if (!profile_type || (profile_type !== 'user' && profile_type !== 'company')) {
      return res.status(400).json({
        success: false,
        error: 'profile_type is required and must be "user" or "company"'
      });
    }

    if (profile_type === 'company' && !company_id) {
      return res.status(400).json({
        success: false,
        error: 'company_id is required when profile_type is "company"'
      });
    }

    const participantId = profile_type === 'company' ? company_id : userId;
    const participantType = profile_type === 'company' ? 'company' : 'user';

    // Optimized query - only count, don't fetch data
    const unreadCount = await prisma.conversation.count({
      where: {
        participants: {
          some: {
            participant_id: participantId,
            participant_type: participantType,
            OR: [
              { last_read_at: null },
              {
                conversation: {
                  last_message_at: {
                    gt: prisma.conversationParticipant.fields.last_read_at
                  }
                }
              }
            ]
          }
        },
        last_message_at: {
          not: null
        }
      }
    });

    return res.json({
      success: true,
      data: {
        unread_count: unreadCount,
        profile_type: profile_type,
        profile_id: participantId
      }
    });
  } catch (error: any) {
    console.error('Error fetching unread conversation count:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch unread conversation count'
    });
  }
});
```

---

## Database Query Optimization

### Indexes Required

For optimal performance, ensure these indexes exist:

```sql
-- Index on conversation_participants for fast lookups
CREATE INDEX IF NOT EXISTS idx_conversation_participants_lookup 
ON conversation_participants(participant_id, participant_type);

-- Index on last_read_at for unread filtering
CREATE INDEX IF NOT EXISTS idx_conversation_participants_last_read 
ON conversation_participants(last_read_at) 
WHERE last_read_at IS NOT NULL;

-- Index on conversations last_message_at
CREATE INDEX IF NOT EXISTS idx_conversations_last_message 
ON conversations(last_message_at) 
WHERE last_message_at IS NOT NULL;

-- Composite index for the unread count query
CREATE INDEX IF NOT EXISTS idx_conversation_participants_unread 
ON conversation_participants(participant_id, participant_type, last_read_at);
```

---

## Frontend Integration

### Update API Client

**File:** `packages/onecrew-api-client/src/chat.ts` (or similar)

```typescript
/**
 * Get unread conversation count
 * Lightweight endpoint that returns only the count
 */
async getUnreadConversationCount(params: {
  profile_type: 'user' | 'company';
  company_id?: string;
}): Promise<ApiResponse<{ unread_count: number; profile_type: string; profile_id: string }>> {
  const queryParams = new URLSearchParams({
    profile_type: params.profile_type,
  });
  
  if (params.company_id) {
    queryParams.append('company_id', params.company_id);
  }

  return this.get(`/chat/conversations/unread-count?${queryParams.toString()}`);
}
```

### Update ApiContext

**File:** `src/contexts/ApiContext.tsx`

```typescript
// Add to API methods
const getUnreadConversationCount = async (): Promise<number> => {
  try {
    const params: any = {
      profile_type: currentProfileType === 'company' ? 'company' : 'user',
    };
    
    if (currentProfileType === 'company' && activeCompany?.id) {
      params.company_id = activeCompany.id;
    }
    
    const response = await api.chat.getUnreadConversationCount(params);
    if (response.success && response.data) {
      const count = response.data.unread_count || 0;
      setUnreadConversationCount(count);
      return count;
    }
    return 0;
  } catch (error: any) {
    console.warn('⚠️ Failed to get unread conversation count:', error);
    return 0;
  }
};

// Update updateUnreadCount to use the new endpoint
const updateUnreadCount = async () => {
  try {
    if (isMounted) {
      // Use the lightweight endpoint instead of fetching all conversations
      const count = await getUnreadConversationCount();
      if (__DEV__) {
        console.log('💬 [UnreadCount] Updated from lightweight endpoint:', count);
      }
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('⚠️ [UnreadCount] Lightweight endpoint failed, falling back to full fetch');
    }
    // Fallback to pagination method if lightweight endpoint fails
    // ... existing pagination code ...
  }
};
```

---

## Performance Comparison

### Before (Fetching All Conversations)
- **Request:** `GET /api/chat/conversations?limit=1000`
- **Response Size:** ~500KB - 2MB (depending on conversation count)
- **Response Time:** 500ms - 2000ms
- **Database Load:** High (fetches all conversation data)

### After (Lightweight Count Endpoint)
- **Request:** `GET /api/chat/conversations/unread-count?profile_type=user`
- **Response Size:** ~100 bytes
- **Response Time:** 50ms - 200ms
- **Database Load:** Low (only counts, no data fetching)

### Performance Improvement
- **10x faster** response time
- **1000x smaller** response size
- **Much lower** database load
- **Instant** badge updates

---

## Rate Limiting

Add rate limiting to prevent abuse:

```typescript
import rateLimit from 'express-rate-limit';

const unreadCountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many unread count requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/conversations/unread-count', 
  authenticateToken, 
  unreadCountLimiter, // Add rate limiter
  async (req, res) => {
    // ... endpoint implementation
  }
);
```

---

## Caching (Optional)

For even better performance, add Redis caching:

```typescript
import { getRedisClient } from '../utils/redis';

router.get('/conversations/unread-count', authenticateToken, async (req, res) => {
  try {
    // ... validation code ...

    const cacheKey = `unread_count:${participantType}:${participantId}`;
    const redisClient = getRedisClient();

    // Try cache first
    if (redisClient) {
      const cached = await redisClient.get(cacheKey);
      if (cached !== null) {
        return res.json({
          success: true,
          data: {
            unread_count: parseInt(cached, 10),
            profile_type: profile_type,
            profile_id: participantId,
            cached: true
          }
        });
      }
    }

    // ... database query ...

    // Cache result for 10 seconds
    if (redisClient) {
      await redisClient.setex(cacheKey, 10, unreadCount.toString());
    }

    return res.json({
      success: true,
      data: {
        unread_count: unreadCount,
        profile_type: profile_type,
        profile_id: participantId
      }
    });
  } catch (error: any) {
    // ... error handling ...
  }
});
```

**Cache Invalidation:**
- Invalidate cache when a message is sent
- Invalidate cache when a conversation is marked as read
- Cache TTL: 10 seconds (short enough for real-time feel, long enough to reduce load)

---

## Testing

### Manual Testing

```bash
# Test user profile unread count
curl -X GET "https://your-api.com/api/chat/conversations/unread-count?profile_type=user" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test company profile unread count
curl -X GET "https://your-api.com/api/chat/conversations/unread-count?profile_type=company&company_id=123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Expected Response

```json
{
  "success": true,
  "data": {
    "unread_count": 1,
    "profile_type": "user",
    "profile_id": "user-123"
  }
}
```

---

## Deployment Checklist

- [ ] Add endpoint to chat routes
- [ ] Add authentication middleware
- [ ] Add rate limiting
- [ ] Create database indexes
- [ ] Add Redis caching (optional)
- [ ] Update API client
- [ ] Update frontend ApiContext
- [ ] Test endpoint manually
- [ ] Monitor performance
- [ ] Deploy to staging
- [ ] Test in staging
- [ ] Deploy to production

---

## Benefits

1. **Instant Updates** - Badge updates immediately (< 200ms)
2. **Reduced Load** - Much less database and network load
3. **Better UX** - Users see accurate counts instantly
4. **Scalable** - Can handle many concurrent requests
5. **Cost Effective** - Less bandwidth and compute usage

---

## Migration Plan

1. **Phase 1:** Deploy backend endpoint
2. **Phase 2:** Update API client
3. **Phase 3:** Update frontend to use new endpoint
4. **Phase 4:** Keep old method as fallback
5. **Phase 5:** Monitor and optimize
6. **Phase 6:** Remove old pagination method (optional)

---

**Status:** Ready for backend implementation
**Priority:** High - Will significantly improve UX and performance
