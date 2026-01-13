# Quick TestFlight Build - Ready to Start

## Current Status
✅ Logged in to EAS as: `m_rh50@yahoo.com`
✅ EAS CLI ready
✅ Ready to build

## Build Command

Run this to start the TestFlight build:

```bash
eas build --platform ios --profile production
```

Or use the automated script:

```bash
./build-testflight.sh
```

## What Happens Next

1. **Build starts** (15-30 minutes)
   - EAS builds your iOS app
   - Creates production .ipa file
   - Uploads to EAS servers

2. **Monitor progress:**
   - Watch terminal output
   - Or check: https://expo.dev

3. **After build completes:**
   - Submit to TestFlight: `eas submit --platform ios --latest`
   - Or use the script which does it automatically

## Quick Commands

```bash
# Build for TestFlight
eas build --platform ios --profile production

# Submit to TestFlight (after build)
eas submit --platform ios --latest

# Check build status
eas build:list --platform ios
```

## Notes

- Build number will auto-increment
- Current version: 1.3.3 (from app.json)
- Bundle ID: com.minaezzat.onesteps
- Build profile: production (App Store ready)

