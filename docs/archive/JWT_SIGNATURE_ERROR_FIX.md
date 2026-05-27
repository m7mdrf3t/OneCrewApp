# JWT Signature Error - Fix Guide

## Error Message
```
JWTAuth error: signature is not valid. Make sure the token is created using the secret for API key "gjs4e7pmvpum"
```

## Problem
The backend is generating Stream Chat tokens, but the **secret** used to sign the tokens doesn't match the API key `gjs4e7pmvpum`.

## Root Cause
The backend's Stream Chat client must be initialized with:
1. **API Key**: `gjs4e7pmvpum` ✅ (This is correct)
2. **Secret**: Must match the secret for this API key ❌ (This is likely wrong or missing)

## Solution

### Step 1: Check Backend Stream Chat Config

In the backend project, find where `streamChatClient` is initialized (likely in `src/domains/chat/config/streamChat.ts` or similar).

It should look like:
```typescript
import { StreamChat } from 'stream-chat';

const streamChatClient = StreamChat.getInstance(
  process.env.STREAM_CHAT_API_KEY!,  // API Key: gjs4e7pmvpum
  process.env.STREAM_CHAT_SECRET!     // Secret: Must match the API key
);
```

### Step 2: Verify Environment Variables

In the backend `.env` file, ensure you have:
```env
STREAM_CHAT_API_KEY=gjs4e7pmvpum
STREAM_CHAT_SECRET=your_actual_secret_here
```

**Important:** The `STREAM_CHAT_SECRET` must be the secret that corresponds to API key `gjs4e7pmvpum` in your Stream Chat dashboard.

### Step 3: Get the Correct Secret

1. Go to [Stream Chat Dashboard](https://dashboard.getstream.io/)
2. Select your app (the one with API key `gjs4e7pmvpum`)
3. Go to **Settings** → **API Keys**
4. Copy the **Secret** (not the API key)
5. Update your backend `.env` file with this secret

### Step 4: Restart Backend

After updating the `.env` file:
```bash
# Stop the backend (Ctrl+C)
# Then restart:
npm run dev
```

### Step 5: Test Again

After restarting, test the endpoint:
```bash
./test-local-backend.sh
```

## Quick Check

Run this in your backend terminal to verify the secret is set:
```bash
echo $STREAM_CHAT_SECRET
```

If it's empty or wrong, that's the problem!

## Alternative: Check Backend Logs

Check backend logs for initialization:
```bash
tail -f /tmp/onecrew-backend.log
```

Look for errors about Stream Chat initialization or missing secrets.

## Summary

- ✅ API Key: `gjs4e7pmvpum` (correct)
- ❌ Secret: Must match the API key (likely wrong or missing)
- 🔧 Fix: Update `STREAM_CHAT_SECRET` in backend `.env` with correct secret from Stream dashboard
- 🔄 Restart: Restart backend server after updating `.env`

