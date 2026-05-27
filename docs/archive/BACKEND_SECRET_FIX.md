# Backend Secret Fix - JWT Signature Error

## Problem
```
JWTAuth error: signature is not valid. Make sure the token is created using the secret for API key "gjs4e7pmvpum"
```

## Root Cause
The backend's Stream Chat client needs the **correct secret** that matches API key `gjs4e7pmvpum`.

## Backend Configuration

The backend uses these environment variables:
- `STREAM_API_KEY` (or `STREAM_CHAT_API_KEY`)
- `STREAM_API_SECRET` (must match the API key)

## Fix Steps

### Step 1: Check Backend `.env` File

In your backend project (`/Users/aghone01/Documents/CS/OneCrew_BE/OneCrewBE`), check the `.env` file:

```env
STREAM_API_KEY=gjs4e7pmvpum
STREAM_API_SECRET=your_secret_here
```

**OR:**

```env
STREAM_CHAT_API_KEY=gjs4e7pmvpum
STREAM_CHAT_SECRET=your_secret_here
```

### Step 2: Get the Correct Secret

1. Go to [Stream Chat Dashboard](https://dashboard.getstream.io/)
2. Login to your account
3. Select the app with API key `gjs4e7pmvpum`
4. Go to **Settings** → **API Keys**
5. Copy the **Secret** (it's a long string, different from the API key)

### Step 3: Update Backend `.env`

Add or update the secret in your backend `.env`:

```env
STREAM_API_KEY=gjs4e7pmvpum
STREAM_API_SECRET=paste_your_secret_here
```

**Important:** Make sure there are no spaces or quotes around the values.

### Step 4: Restart Backend

After updating `.env`, restart your backend:

```bash
# In backend terminal, stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 5: Verify

Check backend logs to ensure it starts without errors:
```bash
tail -f /tmp/onecrew-backend.log
```

Look for:
- ✅ No errors about missing Stream Chat variables
- ✅ Server starts successfully

### Step 6: Test Again

After restarting, test the endpoint:
```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
./test-local-backend.sh
```

Or manually:
```bash
TOKEN=$(curl -s -X POST http://172.23.179.222:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"ghoneem77@gmail.com","password":"password123"}' \
  | jq -r '.data.token')

curl -X POST http://172.23.179.222:3000/api/chat/token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq .
```

## Quick Check Commands

### Check if secret is set (in backend terminal):
```bash
echo $STREAM_API_SECRET
```

If empty, that's the problem!

### Check backend config file:
The backend config is at:
```
src/domains/chat/config/streamChat.ts
```

It expects:
- `STREAM_API_KEY` or `STREAM_CHAT_API_KEY`
- `STREAM_API_SECRET` or `STREAM_CHAT_SECRET`

## Common Issues

### Issue 1: Secret Not Set
**Symptom:** Backend throws error on startup about missing variables
**Fix:** Add `STREAM_API_SECRET` to `.env`

### Issue 2: Wrong Secret
**Symptom:** JWT signature error (current issue)
**Fix:** Get correct secret from Stream dashboard and update `.env`

### Issue 3: Secret Has Spaces/Quotes
**Symptom:** Backend can't parse the secret
**Fix:** Remove quotes and spaces from `.env` values

## Summary

- ✅ API Key: `gjs4e7pmvpum` (correct)
- ❌ Secret: Must be the correct secret for this API key
- 🔧 Fix: Update `STREAM_API_SECRET` in backend `.env` with secret from Stream dashboard
- 🔄 Restart: Restart backend after updating `.env`
- 🧪 Test: Test endpoint again after restart

