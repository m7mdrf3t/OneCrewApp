# Quick Start: Fix Stream Chat on Staging

## Problem
Stream Chat works on local backend but returns 404 on staging.

## Solution Summary

The staging backend needs:
1. ✅ Code fixes (already in local repo)
2. ⏳ Deploy fixes to staging branch
3. ⏳ Update Google Cloud secrets
4. ⏳ Test endpoint

## Quick Steps

### 1. Make Scripts Executable
```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
chmod +x update-staging-secrets.sh test-staging-endpoint.sh
```

### 2. Update Google Cloud Secrets
```bash
./update-staging-secrets.sh
```

This updates:
- `stream-api-key` → `j8yy2mzarh3n`
- `stream-api-secret` → `zyjb2pp4ecxf5fpmnu3ekv5zzugs4uhmz92s3t583earzby3s6cesbtjyrjyesba`

### 3. Deploy to Staging

**Option A: If staging auto-deploys on push**
```bash
cd /Users/aghone01/Documents/CS/OneCrew_BE/OneCrewBE
git checkout develop  # or staging branch
git pull origin develop
# Ensure fixes are merged (they should be from 'amr' branch)
git push origin develop
```

**Option B: Manual deployment**
```bash
cd /Users/aghone01/Documents/CS/OneCrew_BE/OneCrewBE
gcloud builds submit --config=cloudbuild-staging.yaml --project=cool-steps .
```

### 4. Test Endpoint
```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
./test-staging-endpoint.sh
```

Expected: ✅ Endpoint returns token with `user_id: "onecrew_user_..."`

### 5. Update Frontend

Edit `src/contexts/ApiContext.tsx` line 449:
```typescript
baseUrl = 'https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app' // Staging server
```

### 6. Test in App
1. Reload app
2. Login
3. Navigate to Messages
4. Verify Stream Chat connects

## Troubleshooting

**404 Error:** Code not deployed → Deploy fixes  
**500 Error (API key):** Secrets not updated → Run `./update-staging-secrets.sh`  
**Wrong user_id format:** Code not merged → Merge fixes to staging branch

## Full Guide

See `STAGING_DEPLOYMENT_GUIDE.md` for detailed instructions.



