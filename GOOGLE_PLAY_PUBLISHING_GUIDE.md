# Google Play Store Publishing Guide

## ✅ Completed Steps

### Phase 1: Configuration ✅
- ✅ Privacy policy URL added to `app.json`: `https://steps.cool/privacy-policy.html`
- ✅ EAS production profile verified
- ✅ All assets verified (icon, adaptive-icon, splash)
- ✅ App configuration complete

## 📋 Remaining Steps

### Step 1: Fix EAS Permissions

You need to ensure you have access to the EAS project. The project ID is: `bcee7258-fd98-44a4-b91e-6dd89f4ebf96`

**Options:**
1. **If you own the project**: Verify you're logged in with the correct account
2. **If someone else owns it**: Ask them to add you as a collaborator
3. **Create a new project**: If needed, you can create a new EAS project

**To check/fix:**
```bash
# Check current login
eas whoami

# If wrong account, login with correct one
eas login

# If you need to create/switch project
eas init
```

### Step 2: Build Production AAB

Once permissions are fixed, build the production release:

```bash
eas build --platform android --profile production
```

This will:
- Create a signed Android App Bundle (AAB)
- Upload to EAS servers
- Provide a download link
- Take approximately 10-20 minutes

**Alternative: Local Build**
If EAS permissions can't be resolved, you can build locally:
```bash
cd android
./gradlew bundleRelease
```
Note: You'll need to configure signing for local builds.

### Step 3: Test Production Build

1. Download the AAB from EAS (or from `android/app/build/outputs/bundle/release/` for local builds)
2. Install on a physical Android device:
   ```bash
   # Convert AAB to APK for testing (optional)
   bundletool build-apks --bundle=app-release.aab --output=app.apks
   
   # Or install directly if device supports AAB
   adb install app-release.aab
   ```
3. Test all features:
   - Authentication flow
   - All permissions
   - Core functionality
   - Verify no crashes

### Step 4: Google Play Console Setup

#### 4.1 Sign In and Create App
1. Go to [Google Play Console](https://play.google.com/console)
2. Sign in with your Google account
3. Create new app (if not already created):
   - App name: **Steps**
   - Default language: English (or your preferred language)
   - App or game: Select appropriate category
   - Free or paid: Select pricing model

#### 4.2 Complete Store Listing

**Required:**
- **App Title**: "Steps" (max 50 characters)
- **Short Description**: 80 characters max
  - Example: "Manage your film projects, collaborate with your team, and track your career."
- **Full Description**: Up to 4000 characters
  - Describe features, benefits, use cases
- **App Icon**: Upload 512x512px icon (`assets/icon.png`)
- **Feature Graphic**: 1024x500px (required)
  - Create a promotional banner for your app
- **Screenshots**: 
  - Phone screenshots: At least 2, up to 8
  - Recommended size: 1080x1920px or higher
  - Show key features of your app

**Optional but Recommended:**
- Promotional video (YouTube link)
- Promotional images

#### 4.3 Content Rating

1. Go to **Content rating** section
2. Complete the questionnaire about your app's content
3. Answer questions about:
   - Violence, sexual content, profanity, etc.
   - User-generated content
   - Social features
4. Get rating certificate (IARC, ESRB, etc.)

#### 4.4 Privacy & Compliance

1. **Privacy Policy URL**: 
   - Add: `https://steps.cool/privacy-policy.html`
   - Must be publicly accessible

2. **Data Safety Section**:
   - Declare what data you collect
   - Declare how data is used
   - Declare data sharing practices
   - Declare security practices
   - Based on your privacy policy at https://steps.cool/privacy-policy.html

3. **Target Audience**:
   - Specify age group
   - Indicate if app is for children

#### 4.5 App Access

- If your app requires sign-in, provide:
  - Demo account credentials for reviewers
  - Instructions on how to access the app

### Step 5: Upload Release

1. Go to **Production** (or **Internal testing** / **Closed testing** for testing first)
2. Click **Create new release**
3. Upload the AAB file from EAS build
4. Add **Release notes**:
   - What's new in version 1.1.0
   - Bug fixes
   - New features
5. Review the release:
   - Check version code and version name
   - Review permissions
   - Check for warnings

### Step 6: Submit for Review

**Pre-Submission Checklist:**
- [ ] All store listing information complete
- [ ] Content rating completed
- [ ] Privacy policy URL added: `https://steps.cool/privacy-policy.html`
- [ ] Data safety section completed
- [ ] App tested on multiple devices
- [ ] No critical bugs or crashes
- [ ] Release notes written
- [ ] AAB uploaded and reviewed

**Submit:**
1. Click **Review release** in Play Console
2. Review all sections for completeness
3. Submit for review
4. Google typically reviews within 1-3 business days

### Step 7: Monitor Review

1. Check Play Console for review status
2. Respond to any reviewer questions promptly
3. If rejected, fix issues and resubmit

### Step 8: After Approval

- App goes live automatically (or on scheduled date)
- Monitor user reviews
- Monitor crash reports in Play Console
- Track analytics
- Plan for regular updates

## 📝 Important Information

### App Details
- **Package Name**: `com.minaezzat.onesteps`
- **Version**: 1.1.0
- **Version Code**: 2 (will auto-increment with EAS)
- **Privacy Policy**: https://steps.cool/privacy-policy.html
- **Play Store URL**: https://play.google.com/store/apps/details?id=com.minaezzat.onesteps

### EAS Project
- **Project ID**: `bcee7258-fd98-44a4-b91e-6dd89f4ebf96`
- **Current User**: amrghoneem
- **Status**: Permissions issue - needs to be resolved

### Build Configuration
- **Build Tool**: EAS Build (recommended)
- **Output Format**: Android App Bundle (AAB)
- **Signing**: EAS-managed (automatic)
- **Auto-increment**: Enabled

## 🔧 Troubleshooting

### EAS Permissions Issue
If you get "Entity not authorized" error:
1. Verify project ownership
2. Check if you're logged in with the correct account
3. Ask project owner to add you as collaborator
4. Or create a new EAS project with `eas init`

### Build Fails
- Check EAS build logs for errors
- Verify all dependencies are installed
- Ensure `app.json` is valid JSON
- Check that all assets exist

### Play Console Issues
- Ensure all required fields are filled
- Privacy policy URL must be publicly accessible
- Screenshots must meet size requirements
- Content rating must be completed

## 📚 Resources

- [Google Play Console](https://play.google.com/console)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Android App Bundle Guide](https://developer.android.com/guide/app-bundle)
- [Play Store Policies](https://play.google.com/about/developer-content-policy/)

## ✅ Quick Start Commands

```bash
# 1. Fix EAS permissions (if needed)
eas login
# or
eas init

# 2. Build production AAB
eas build --platform android --profile production

# 3. Download and test the AAB
# (Download link provided after build completes)

# 4. Upload to Play Console
# (Manual upload via Play Console web interface)
```

## 🎯 Next Actions

1. **Resolve EAS permissions** - Ensure you have access to the project
2. **Build production AAB** - Run the build command
3. **Test the build** - Install on physical device and test
4. **Complete Play Console setup** - Fill in all required information
5. **Submit for review** - Upload AAB and submit

Good luck with your publication! 🚀

