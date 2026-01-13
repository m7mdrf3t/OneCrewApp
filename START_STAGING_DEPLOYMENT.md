# Start Staging Deployment - Step by Step

## Current Status
✅ Code fixes are ready in local repository  
✅ Deployment scripts are prepared  
⏳ Ready to deploy to staging

## Step-by-Step Execution

### Step 1: Make Scripts Executable
```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
chmod +x update-staging-secrets.sh test-staging-endpoint.sh
```

### Step 2: Update Google Cloud Secrets
This updates the Stream Chat API key and secret in Google Cloud Secret Manager:

```bash
./update-staging-secrets.sh
```

**What it does:**
- Updates `stream-api-key` secret → `j8yy2mzarh3n`
- Updates `stream-api-secret` secret → `zyjb2pp4ecxf5fpmnu3ekv5zzugs4uhmz92s3t583earzby3s6cesbtjyrjyesba`

**Requirements:**
- gcloud CLI installed and authenticated
- Access to `cool-steps` project
- Permission to update secrets

### Step 3: Verify Code is Ready for Deployment

Check which branch staging uses and ensure fixes are merged:

```bash
cd /Users/aghone01/Documents/CS/OneCrew_BE/OneCrewBE

# Check current branch
git branch

# If staging uses 'develop' branch, check if fixes are there
git checkout develop
git pull origin develop

# Verify token endpoint exists
grep -A 5 "router.post('/token'" src/domains/chat/routes/chat.ts

# If endpoint doesn't exist, merge from 'amr' branch or apply fixes
```

### Step 4: Deploy to Staging

**Option A: Auto-deploy (if staging auto-deploys on push to develop)**
```bash
cd /Users/aghone01/Documents/CS/OneCrew_BE/OneCrewBE
git checkout develop
git pull origin develop

# If fixes aren't merged yet, merge them:
# git merge amr  # or the branch with fixes
# git push origin develop
```

**Option B: Manual Cloud Build Deployment**
```bash
cd /Users/aghone01/Documents/CS/OneCrew_BE/OneCrewBE
gcloud builds submit \
  --config=cloudbuild-staging.yaml \
  --project=cool-steps \
  .
```

**Option C: Trigger via Google Cloud Console**
1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers?project=cool-steps)
2. Find the staging trigger
3. Click "Run" to trigger deployment

### Step 5: Wait for Deployment

Monitor the build:
- Cloud Build Console: https://console.cloud.google.com/cloud-build/builds?project=cool-steps
- Wait for build to complete (usually 5-10 minutes)

### Step 6: Test the Endpoint

Once deployment completes:

```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
./test-staging-endpoint.sh
```

**Expected Success Output:**
```
✅ Endpoint is working!
📋 Response Details:
  - success: true ✅
  - user_id: onecrew_user_... ✅ (correctly formatted)
  - api_key: j8yy2mzarh3n ✅ (correct)
  - token: eyJ... ✅ (present)
```

**If you get 404:**
- Code wasn't deployed → Re-check Step 3 and 4
- Wrong branch deployed → Verify which branch staging uses

**If you get 500 (API key error):**
- Secrets not updated → Re-run Step 2
- Secrets not picked up → Re-deploy after updating secrets

### Step 7: Update Frontend to Use Staging

Edit `src/contexts/ApiContext.tsx` line 449:

```typescript
// Change from:
baseUrl = 'http://192.168.100.92:3000' // Local server

// To:
baseUrl = 'https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app' // Staging server
```

### Step 8: Test in App

1. **Reload the app:**
   - Stop Metro bundler (Ctrl+C)
   - Restart: `npx expo start --clear`

2. **Test Stream Chat:**
   - Login: `ghoneem77@gmail.com` / `password123`
   - Navigate to Messages tab
   - Should connect successfully (no "Connecting to chat..." stuck)
   - Create a conversation
   - Send a message

## Quick Command Summary

```bash
# 1. Make scripts executable
cd /Users/aghone01/Documents/CS/OneCrewApp
chmod +x update-staging-secrets.sh test-staging-endpoint.sh

# 2. Update secrets
./update-staging-secrets.sh

# 3. Deploy (choose one method)
cd /Users/aghone01/Documents/CS/OneCrew_BE/OneCrewBE
# Option A: Push to trigger auto-deploy
git checkout develop && git pull && git push origin develop
# OR Option B: Manual build
gcloud builds submit --config=cloudbuild-staging.yaml --project=cool-steps .

# 4. Wait for deployment (5-10 minutes)

# 5. Test endpoint
cd /Users/aghone01/Documents/CS/OneCrewApp
./test-staging-endpoint.sh

# 6. Update frontend baseUrl (edit ApiContext.tsx line 449)

# 7. Test in app
```

## Troubleshooting

### Issue: Scripts not executable
```bash
chmod +x update-staging-secrets.sh test-staging-endpoint.sh
```

### Issue: gcloud not authenticated
```bash
gcloud auth login
gcloud config set project cool-steps
```

### Issue: Secrets don't exist
Create them first:
```bash
echo -n "j8yy2mzarh3n" | gcloud secrets create stream-api-key --data-file=- --project=cool-steps
echo -n "zyjb2pp4ecxf5fpmnu3ekv5zzugs4uhmz92s3t583earzby3s6cesbtjyrjyesba" | \
  gcloud secrets create stream-api-secret --data-file=- --project=cool-steps
```

### Issue: Deployment fails
- Check Cloud Build logs in Google Cloud Console
- Verify code is in the correct branch
- Ensure secrets are updated before deploying

## Next Steps After Success

Once staging is working:
1. ✅ Test all Stream Chat features
2. ✅ Verify conversations work between users
3. ✅ Test message sending/receiving
4. ✅ Consider deploying to production

## Support

- Full guide: `STAGING_DEPLOYMENT_GUIDE.md`
- Quick reference: `STAGING_QUICK_START.md`
- Summary: `STAGING_IMPLEMENTATION_SUMMARY.md`


