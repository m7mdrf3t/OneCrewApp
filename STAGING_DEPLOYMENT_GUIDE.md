# Staging Backend Deployment Guide - Stream Chat Fixes

## Current Status

✅ **Local Backend:** All fixes are implemented and working  
❌ **Staging Backend:** Missing `/api/chat/token` endpoint (404 error)  
📍 **Staging URL:** `https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app`

## Required Fixes

The staging backend needs:

1. **Stream Chat Token Endpoint** (`/api/chat/token`)
2. **Channel Creation Fixes** (members passed during creation)
3. **Member ID Formatting** (proper `onecrew_user_{id}` format)
4. **Environment Variables** (Stream Chat API key and secret)

## Deployment Steps

### Step 1: Verify Code is Ready

The fixes are already in the local repository. Verify they're in the branch that staging uses:

```bash
cd /Users/aghone01/Documents/CS/OneCrew_BE/OneCrewBE

# Check current branch (should be develop or staging branch)
git branch

# Verify token endpoint exists
grep -A 20 "router.post('/token'" src/domains/chat/routes/chat.ts

# Verify channel creation has members
grep -A 5 "members: uniqueMembers" src/domains/chat/services/streamChatService.ts
```

### Step 2: Commit and Push Fixes (if not already done)

If the fixes aren't committed yet:

```bash
cd /Users/aghone01/Documents/CS/OneCrew_BE/OneCrewBE

# Check which branch staging uses (likely 'develop' or 'staging')
# Switch to that branch
git checkout develop  # or 'staging' if that's what staging uses

# Pull latest changes
git pull origin develop

# Create a branch for the fixes
git checkout -b fix/stream-chat-staging

# Verify files have the fixes
# If not, merge from 'amr' branch or apply fixes manually

# Commit the fixes
git add src/domains/chat/routes/chat.ts
git add src/domains/chat/services/streamChatService.ts
git commit -m "fix: Add Stream Chat token endpoint and channel creation fixes for staging

- Add POST /api/chat/token endpoint
- Fix channel creation to pass members during initialization
- Fix member ID formatting (onecrew_user_{id})
- Add member verification to detect array indices"

# Push to remote
git push origin fix/stream-chat-staging
```

### Step 3: Merge to Staging Branch

Merge the fixes to the branch that staging deploys from:

```bash
# If staging uses 'develop' branch
git checkout develop
git pull origin develop
git merge fix/stream-chat-staging
git push origin develop

# Or if staging uses a different branch (e.g., 'staging')
git checkout staging
git pull origin staging
git merge fix/stream-chat-staging
git push origin staging
```

### Step 4: Update Google Cloud Secrets

The staging deployment uses Google Cloud Secrets. Update the Stream Chat credentials:

**Option A: Using Google Cloud Console**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Secret Manager**
3. Find the secret: `stream-api-key`
4. Create a new version with value: `j8yy2mzarh3n`
5. Find the secret: `stream-api-secret`
6. Create a new version with value: `zyjb2pp4ecxf5fpmnu3ekv5zzugs4uhmz92s3t583earzby3s6cesbtjyrjyesba`

**Option B: Using gcloud CLI**

```bash
# Set Stream Chat API Key
echo -n "j8yy2mzarh3n" | gcloud secrets versions add stream-api-key \
  --data-file=- \
  --project=cool-steps

# Set Stream Chat Secret
echo -n "zyjb2pp4ecxf5fpmnu3ekv5zzugs4uhmz92s3t583earzby3s6cesbtjyrjyesba" | \
  gcloud secrets versions add stream-api-secret \
  --data-file=- \
  --project=cool-steps
```

**Note:** The secrets are referenced in `cloudbuild-staging.yaml` at line 60:
```yaml
--update-secrets
'STREAM_API_KEY=stream-api-key:latest,STREAM_API_SECRET=stream-api-secret:latest'
```

### Step 5: Trigger Staging Deployment

Deploy to staging using Google Cloud Build:

**Option A: Using Google Cloud Console**

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Find the staging trigger
3. Click "Run" to trigger a new build
4. Monitor the build logs

**Option B: Using gcloud CLI**

```bash
# Submit build using cloudbuild-staging.yaml
gcloud builds submit \
  --config=cloudbuild-staging.yaml \
  --project=cool-steps \
  /Users/aghone01/Documents/CS/OneCrew_BE/OneCrewBE
```

**Option C: Push to Trigger Auto-Deploy**

If staging auto-deploys on push:

```bash
cd /Users/aghone01/Documents/CS/OneCrew_BE/OneCrewBE
git push origin develop  # or staging branch
```

### Step 6: Verify Deployment

After deployment completes, test the endpoint:

```bash
# Get a JWT token first (login)
TOKEN=$(curl -s -X POST https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"ghoneem77@gmail.com","password":"password123"}' \
  | jq -r '.data.token')

# Test the token endpoint
curl -X POST https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app/api/chat/token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "user_id": "onecrew_user_dda3aaa6-d123-4e57-aeef-f0661ec61352",
    "api_key": "j8yy2mzarh3n"
  }
}
```

**If you get 404:** The deployment didn't include the fixes. Check:
- Which branch was deployed
- If the code was merged correctly
- Build logs for errors

### Step 7: Update Frontend to Test Staging

Once staging is working, update the frontend:

```typescript
// In src/contexts/ApiContext.tsx (line 449)
baseUrl = 'https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app' // Staging server
```

Then test the app:
1. Reload the app
2. Login
3. Navigate to Messages
4. Verify Stream Chat connects successfully
5. Test creating conversations
6. Test sending messages

## Troubleshooting

### Issue: Still Getting 404

**Check:**
1. Which branch staging deploys from
2. If that branch has the latest fixes
3. Build logs for deployment errors
4. If secrets are updated correctly

**Solution:**
- Verify the branch has the fixes: `grep -r "router.post('/token'" src/domains/chat/routes/`
- Re-deploy after ensuring code is merged

### Issue: 500 Error (API Key Not Configured)

**Check:**
- Secrets are updated in Google Cloud Secret Manager
- Secret names match: `stream-api-key` and `stream-api-secret`
- Latest version of secrets is being used

**Solution:**
- Update secrets as described in Step 4
- Re-deploy to pick up new secret versions

### Issue: Token Generated But Wrong Format

**Check:**
- Code has the user ID formatting fix
- JWT contains `category` field

**Solution:**
- Verify `src/domains/chat/routes/chat.ts` line 474 uses `req.user?.category`
- Verify line 478 formats as `onecrew_${userType}_${userId}`

## Files Modified

1. **`src/domains/chat/routes/chat.ts`**
   - Added `POST /api/chat/token` endpoint (lines 468-501)
   - Returns formatted `user_id` and `api_key`

2. **`src/domains/chat/services/streamChatService.ts`**
   - Fixed `createOrGetChannel` to pass members during creation (line 127)
   - Added member verification to detect array indices (lines 148-180)
   - User upsert before channel creation (lines 698-791)

## Verification Checklist

- [ ] Code fixes are in the staging branch
- [ ] Google Cloud secrets are updated
- [ ] Deployment triggered successfully
- [ ] `/api/chat/token` endpoint returns 200 (not 404)
- [ ] Token response includes `user_id` starting with `onecrew_user_`
- [ ] Token response includes `api_key: "j8yy2mzarh3n"`
- [ ] Frontend can connect to Stream Chat on staging
- [ ] Conversations can be created on staging
- [ ] Messages can be sent/received on staging

## Next Steps After Deployment

1. Test the endpoint using curl (Step 6)
2. Update frontend `baseUrl` to staging
3. Test full Stream Chat flow in the app
4. Monitor for any errors in logs
5. Once verified, consider deploying to production

