# iOS TestFlight Build Guide

## Prerequisites

1. **EAS CLI installed:**
   ```bash
   npm install -g eas-cli
   ```

2. **Logged in to Expo:**
   ```bash
   eas login
   ```

3. **Apple Developer Account:**
   - Active Apple Developer Program membership
   - App registered in App Store Connect
   - Bundle ID: `com.minaezzat.onesteps`

## Build for TestFlight

### Step 1: Configure Build Profile (if needed)

Your `eas.json` already has a production profile configured. Verify it:

```json
{
  "build": {
    "production": {
      "distribution": "store",
      "developmentClient": false,
      "autoIncrement": true,
      "channel": "production"
    }
  }
}
```

### Step 2: Build iOS App for TestFlight

```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
eas build --platform ios --profile production
```

**What this does:**
- Builds the iOS app with production configuration
- Automatically increments build number (due to `autoIncrement: true`)
- Creates an `.ipa` file ready for App Store/TestFlight
- Uploads build to EAS servers

**Build time:** Usually 15-30 minutes

### Step 3: Monitor Build Progress

You can:
- Watch progress in terminal
- Check status at: https://expo.dev/accounts/[your-account]/projects/steps/builds
- Get notifications when build completes

### Step 4: Submit to TestFlight

**Option A: Automatic Submission (Recommended)**

After build completes, submit directly to App Store Connect:

```bash
eas submit --platform ios --latest
```

This will:
- Use the latest production build
- Upload to App Store Connect
- Make it available in TestFlight

**Option B: Manual Submission**

1. Download the `.ipa` from EAS dashboard
2. Upload manually via:
   - App Store Connect website
   - Transporter app
   - Xcode Organizer

### Step 5: Configure TestFlight in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to your app
3. Go to **TestFlight** tab
4. Wait for build to process (10-30 minutes)
5. Add testers (Internal or External)
6. Add build notes if needed

## Build Profiles Explained

### Production Profile (for TestFlight/App Store)
- `distribution: "store"` - Creates App Store build
- `autoIncrement: true` - Auto-increments build number
- `developmentClient: false` - Production build without dev tools

### Internal Profile (for internal testing)
- `distribution: "internal"` - Internal distribution
- Faster builds, good for testing before TestFlight

## Common Commands

### Build Commands

```bash
# Production build for TestFlight
eas build --platform ios --profile production

# Internal build (faster, for testing)
eas build --platform ios --profile internal

# Build with specific version
eas build --platform ios --profile production --local
```

### Submit Commands

```bash
# Submit latest build
eas submit --platform ios --latest

# Submit specific build
eas submit --platform ios --id [build-id]

# Submit with automatic configuration
eas submit --platform ios --latest --non-interactive
```

### Check Build Status

```bash
# List recent builds
eas build:list --platform ios

# View build details
eas build:view [build-id]
```

## Troubleshooting

### Issue: "No Apple Developer account found"

**Solution:**
```bash
eas credentials
# Select iOS → Apple App Store Connect API Key
# Follow prompts to configure
```

### Issue: "Bundle identifier mismatch"

**Solution:**
- Verify bundle ID in `app.json` matches App Store Connect
- Current bundle ID: `com.minaezzat.onesteps`

### Issue: "Missing provisioning profile"

**Solution:**
```bash
eas credentials
# Select iOS → Provisioning Profile
# EAS will create/update automatically
```

### Issue: Build fails

**Check:**
1. Build logs in EAS dashboard
2. Common issues:
   - Missing dependencies
   - Code signing errors
   - Invalid configuration

**Solution:**
- Review error logs
- Fix configuration issues
- Rebuild

## Pre-Build Checklist

Before building for TestFlight:

- [ ] App version updated in `app.json`
- [ ] Bundle ID matches App Store Connect
- [ ] All dependencies installed (`npm install`)
- [ ] App tested locally
- [ ] Backend URL configured correctly
- [ ] Stream Chat credentials configured
- [ ] No console errors or warnings
- [ ] App icons and splash screens configured

## After TestFlight Build

1. **Test the build:**
   - Install via TestFlight
   - Test all features
   - Verify Stream Chat works
   - Test on multiple devices

2. **Monitor feedback:**
   - Check TestFlight feedback
   - Monitor crash reports
   - Review analytics

3. **Prepare for App Store:**
   - Complete App Store Connect metadata
   - Add screenshots
   - Write app description
   - Submit for review

## Quick Start Command

```bash
# Complete workflow: Build + Submit
eas build --platform ios --profile production && eas submit --platform ios --latest
```

This builds and automatically submits to TestFlight.

## Notes

- **Build numbers:** Auto-incremented by EAS
- **Version numbers:** Set in `app.json` or `package.json`
- **Processing time:** TestFlight processing takes 10-30 minutes after upload
- **TestFlight expiration:** Builds expire after 90 days
- **Update frequency:** You can submit new builds anytime


