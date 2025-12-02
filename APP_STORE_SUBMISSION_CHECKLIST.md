# 📱 Apple App Store Submission Checklist

**App Name:** One Crew  
**Bundle ID:** com.onecrew.steps  
**Version:** 1.0.0  
**Build:** 1  
**Review Date:** 2025-01-27

---

## ✅ Configuration Review

### 1. App Identity & Metadata

#### ✅ Completed
- [x] Bundle Identifier configured: `com.onecrew.steps`
- [x] App Display Name: "One Crew" (in Info.plist)
- [x] Version Number: 1.0.0
- [x] Build Number: 1
- [x] EAS Project ID configured
- [x] Privacy Manifest file exists (PrivacyInfo.xcprivacy)

#### ⚠️ Issues Found
- [ ] **App name inconsistency**: `app.json` has `"name": "steps"` but Info.plist has `"One Crew"`
  - **Fix Required**: Update app.json to match "One Crew"

### 2. Privacy & Permissions

#### ✅ Completed
- [x] Camera permission description: "Allow $(PRODUCT_NAME) to access your camera"
- [x] Photo Library permission: "Allow $(PRODUCT_NAME) to access your photos"
- [x] Microphone permission: "Allow $(PRODUCT_NAME) to access your microphone"
- [x] Face ID permission: "Allow $(PRODUCT_NAME) to access your Face ID biometric data."
- [x] Encryption declaration: `ITSAppUsesNonExemptEncryption: false`
- [x] Privacy Manifest configured with required API types

#### ⚠️ Recommendations
- [ ] **Improve permission descriptions**: Current descriptions are generic. Consider more specific descriptions:
  - Camera: "We need camera access to let you take profile pictures and portfolio photos"
  - Photo Library: "We need photo library access to let you select profile pictures and portfolio images"
  - Microphone: "We need microphone access for video recording in your portfolio" (if applicable)

### 3. Assets & Icons

#### ✅ Completed
- [x] App icon exists: `./assets/icon.png`
- [x] Splash screen configured
- [x] Adaptive icon for Android exists

#### ⚠️ Issues Found
- [ ] **Splash screen format**: Using GIF (`Steps_02.gif`) which may not work properly on iOS
  - **Recommendation**: Convert to PNG or use static image
  - iOS typically uses static images or storyboards for splash screens

### 4. Build Configuration

#### ✅ Completed
- [x] EAS build configuration exists
- [x] Production build profile configured
- [x] Auto-increment enabled for production builds
- [x] iOS minimum version: 12.0
- [x] Supports iPad: `supportsTablet: true`
- [x] Orientation: Portrait (with iPad landscape support)

### 5. App Store Connect Requirements

#### 📋 Required Information (to be completed in App Store Connect)

1. **App Information**
   - [ ] App Name: "One Crew"
   - [ ] Subtitle (optional)
   - [ ] Category: Business / Productivity
   - [ ] Content Rights: You must own or have rights to all content
   - [ ] Age Rating: Complete questionnaire

2. **Pricing and Availability**
   - [ ] Price: Free / Paid
   - [ ] Availability: Select countries

3. **App Privacy**
   - [ ] Privacy Policy URL (required)
   - [ ] Data collection disclosure
   - [ ] Privacy practices questionnaire

4. **App Review Information**
   - [ ] Contact Information
   - [ ] Demo Account (if login required)
   - [ ] Notes for Reviewers
   - [ ] Attachments (screenshots, demo video)

5. **Version Information**
   - [ ] What's New in This Version
   - [ ] Screenshots (required):
     - iPhone 6.7" (iPhone 14 Pro Max, etc.)
     - iPhone 6.5" (iPhone 11 Pro Max, etc.)
     - iPhone 5.5" (iPhone 8 Plus, etc.)
     - iPad Pro 12.9" (if supporting iPad)
   - [ ] App Preview Video (optional but recommended)

6. **App Store Listing**
   - [ ] Description (up to 4000 characters)
   - [ ] Keywords (up to 100 characters)
   - [ ] Support URL
   - [ ] Marketing URL (optional)
   - [ ] Promotional Text (optional, up to 170 characters)

---

## 🔧 Required Fixes

### Priority 1: Critical Issues

1. **Fix App Name Inconsistency**
   - File: `app.json`
   - Change `"name": "steps"` to `"name": "One Crew"`

2. **Review Splash Screen**
   - File: `app.json`
   - Consider converting GIF to PNG or using static image
   - iOS splash screens work best with static images

### Priority 2: Recommended Improvements

1. **Improve Privacy Permission Descriptions**
   - File: `ios/OneCrew/Info.plist`
   - Make descriptions more specific to your app's use case

2. **Add App Store Metadata to app.json** (optional but recommended)
   ```json
   "ios": {
     "supportsTablet": true,
     "bundleIdentifier": "com.onecrew.steps",
     "infoPlist": {
       "ITSAppUsesNonExemptEncryption": false
     },
     "config": {
       "usesNonExemptEncryption": false
     }
   }
   ```

---

## 📝 App Store Connect Checklist

### Before Submission

- [ ] Create App Store Connect account (if not exists)
- [ ] Create new app in App Store Connect
- [ ] Configure app information
- [ ] Upload screenshots for all required device sizes
- [ ] Write app description
- [ ] Set up pricing
- [ ] Complete privacy questionnaire
- [ ] Add support URL
- [ ] Prepare demo account credentials (if needed)
- [ ] Test app thoroughly on physical devices

### Build & Submit

- [ ] Run production build: `eas build --platform ios --profile production`
- [ ] Wait for build to complete
- [ ] Download build from EAS
- [ ] Upload build to App Store Connect (or use `eas submit`)
- [ ] Submit for review
- [ ] Monitor review status

---

## 🚨 Common Rejection Reasons to Avoid

1. **Missing Privacy Policy**: Required if app collects any user data
2. **Incomplete App Information**: All required fields must be filled
3. **Missing Screenshots**: Required for all device sizes you support
4. **Broken Functionality**: App must work without crashes
5. **Placeholder Content**: Remove any test/placeholder content
6. **Incomplete Features**: All features mentioned in description must work
7. **Privacy Violations**: Ensure all data collection is disclosed
8. **Guideline Violations**: Review App Store Review Guidelines

---

## 📋 Pre-Submission Testing

### Functional Testing
- [ ] Test all core features
- [ ] Test authentication flow
- [ ] Test image upload/picking
- [ ] Test project creation
- [ ] Test navigation
- [ ] Test on multiple iOS versions (if possible)
- [ ] Test on iPad (since supportsTablet is true)

### Performance Testing
- [ ] App launches quickly
- [ ] No memory leaks
- [ ] Smooth scrolling
- [ ] Fast image loading
- [ ] Network error handling

### UI/UX Testing
- [ ] All screens render correctly
- [ ] Text is readable
- [ ] Buttons are tappable
- [ ] Dark mode works (if applicable)
- [ ] Safe area handling is correct

---

## 📞 Support Information

Make sure you have:
- [ ] Support URL ready
- [ ] Support email configured
- [ ] Privacy Policy URL ready
- [ ] Terms of Service URL (if applicable)

---

## ✅ Next Steps

1. Fix the app name inconsistency in `app.json`
2. Review and improve privacy permission descriptions
3. Consider converting splash screen from GIF to PNG
4. Prepare all App Store Connect materials
5. Build production version
6. Submit for review

---

**Last Updated:** 2025-01-27



