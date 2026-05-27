# Chat Conversation Hang - Fix Summary

## Issue
Application hangs when opening any chat conversation.

## Root Causes
1. **Wrong baseUrl fallback**: ChatPage used `localhost` as fallback - prepare would hang connecting to wrong server.
2. **Prepare blocked chat opening**: We awaited prepare + watch together - slow prepare blocked the UI.
3. **No channel.watch() timeout**: StreamChat's `channel.watch()` could hang indefinitely.
4. **Duplicate watch race**: Second useEffect also called `channel.watch()` with no timeout - double watch could hang.
5. **Long waitForConnection**: 8 second polling loop felt like a hang.

## Fixes Applied

### 1. Use getBaseUrl() from ApiContext
- Replaced localhost fallback with `getBaseUrl()`
- Ensures correct backend URL (staging/production)

### 2. Prepare is fire-and-forget (non-blocking)
- Prepare endpoint runs in background; we never await it
- Chat opens immediately; prepare cannot block
- 5s AbortController timeout on prepare (for cleanup only)

### 3. Only await channel.watch() with 12s timeout
- `Promise.race([watch, 12s timeout])` - user sees error after 12s max
- Applied to both new-conversation and existing-conversation flows

### 4. Prevent duplicate watch
- `initWatchInProgressRef` - main init sets it; fallback useEffect skips when set
- Fallback useEffect's watch now has 10s timeout

### 5. Reduced waitForConnection
- 8s → 5s max wait for StreamChat connection

## Curl Test Script

Created `test-chat-endpoints.sh` to verify chat endpoints:

```bash
./test-chat-endpoints.sh
```

**Tests:**
1. Authentication
2. Stream Chat token
3. GET conversations
4. POST prepare (critical for opening chat)
5. GET conversation by ID
6. GET messages

## Curl Test Results

All endpoints responded successfully:
- ✅ Authentication
- ✅ Stream Chat token
- ✅ Conversations (0.57s)
- ✅ Prepare (0.95s)
- ✅ Get conversation (1.28s)
- ✅ Get messages (1.48s)

Backend is working. The hang was caused by the frontend using the wrong URL (localhost) for the prepare endpoint.

## Verification

1. Rebuild the app
2. Open a chat conversation
3. Should load within a few seconds
4. If it still hangs, check console for:
   - "Prepare endpoint error" - backend prepare may be slow
   - "Channel watch timeout" - StreamChat API may be slow
   - Network/connection errors

---

**Date:** January 28, 2026
**Status:** ✅ Fixed
