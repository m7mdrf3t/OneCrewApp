# Google Play Store Publication Checklist

This checklist ensures your app is ready for Google Play Store publication.

## Pre-Publication Checklist

### 1. App Configuration

- [x] **Package Name**: `com.minaezzat.onesteps` (configured in `app.json` and `build.gradle`)
- [x] **Version Code**: 2 (increment for each release)
- [x] **Version Name**: 1.1.0 (semantic versioning)
- [x] **App Name**: "Steps" (configured in `app.json`)
- [x] **App Icon**: `./assets/icon.png` (512x512px recommended)
- [x] **Adaptive Icon**: `./assets/adaptive-icon.png` (configured for Android)

### 2. Permissions

All required permissions are configured with proper descriptions:

- [x] `READ_CALENDAR` - Calendar access
- [x] `WRITE_CALENDAR` - Calendar write access
- [x] `ACCESS_FINE_LOCATION` - Location access
- [x] `ACCESS_COARSE_LOCATION` - Approximate location

**Note**: Ensure all permissions have user-friendly descriptions in the Play Console.

### 3. Build Configuration

- [x] **Min SDK Version**: 24 (Android 7.0)
- [x] **Target SDK Version**: 36 (Latest)
- [x] **Compile SDK Version**: 36
- [x] **Build Tools**: 36.0.0
- [x] **ProGuard Rules**: Configured for release builds

### 4. Signing Configuration

**Current Status**: Using debug keystore (for development)

**Before Production**:
- [ ] Generate production keystore:
  ```bash
  keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias release-key -keyalg RSA -keysize 2048 -validity 10000
  ```
- [ ] Store keystore securely (NOT in repository)
- [ ] Update `android/app/build.gradle` to use release signing config
- [ ] Store keystore password securely (use environment variables)

### 5. Release Build

- [x] **Minify Enabled**: Configured in `build.gradle`
- [x] **Shrink Resources**: Enabled for release builds
- [x] **ProGuard**: Configured with proper rules
- [x] **PNG Crunching**: Enabled for release builds

### 6. Privacy & Compliance

- [ ] **Privacy Policy**: Add URL to `app.json` (required for Play Store)
- [ ] **Data Safety**: Complete data safety section in Play Console
- [ ] **Content Rating**: Complete content rating questionnaire
- [ ] **Target Audience**: Specify target audience in Play Console

### 7. Store Listing

- [ ] **App Title**: "Steps" (max 50 characters)
- [ ] **Short Description**: 80 characters max
- [ ] **Full Description**: Up to 4000 characters
- [ ] **Screenshots**: 
  - [ ] Phone screenshots (at least 2)
  - [ ] Tablet screenshots (if supporting tablets)
  - [ ] Feature graphic (1024x500px)
- [ ] **App Icon**: 512x512px
- [ ] **Promotional Video**: Optional but recommended

### 8. Testing

- [ ] **Internal Testing**: Test with internal testers
- [ ] **Closed Testing**: Test with closed beta group
- [ ] **Open Testing**: Optional open beta
- [ ] **Device Testing**: Test on multiple Android devices:
  - [ ] Small phones (e.g., Pixel 3a)
  - [ ] Large phones (e.g., Pixel 7 Pro)
  - [ ] Tablets (if supported)
  - [ ] Different Android versions (7.0+)

### 9. Release Checklist

- [ ] **Version Code**: Incremented
- [ ] **Version Name**: Updated
- [ ] **Release Notes**: Prepared for users
- [ ] **Production Keystore**: Configured and secured
- [ ] **Build APK/AAB**: Generated signed release build
- [ ] **Test Release Build**: Tested on physical devices
- [ ] **Crash Reports**: Monitor for crashes
- [ ] **Analytics**: Set up analytics tracking

### 10. Post-Publication

- [ ] **Monitor Reviews**: Respond to user reviews
- [ ] **Monitor Crashes**: Use Play Console crash reports
- [ ] **Monitor Analytics**: Track user engagement
- [ ] **Update Regularly**: Plan for regular updates

## Build Commands

### Generate Release Build

```bash
# Using EAS Build (recommended)
eas build --platform android --profile production

# Or using Gradle directly
cd android
./gradlew assembleRelease
```

### Generate Signed AAB (for Play Store)

```bash
# Using EAS Build
eas build --platform android --profile production

# Or manually
cd android
./gradlew bundleRelease
```

## Important Notes

1. **Keystore Security**: Never commit keystore files to version control. Store them securely and back them up.

2. **Version Code**: Must increment with each release. Cannot be decreased.

3. **Privacy Policy**: Required for apps that collect user data. Must be accessible via URL.

4. **Content Rating**: Required for all apps. Complete the questionnaire in Play Console.

5. **Data Safety**: Required for apps that collect user data. Complete the data safety section.

6. **Testing**: Always test release builds on physical devices before publishing.

## Resources

- [Google Play Console](https://play.google.com/console)
- [Android App Bundle](https://developer.android.com/guide/app-bundle)
- [Play Store Policies](https://play.google.com/about/developer-content-policy/)
- [App Signing](https://developer.android.com/studio/publish/app-signing)

## Current Configuration

- **Package**: `com.minaezzat.onesteps`
- **Version Code**: 2
- **Version Name**: 1.1.0
- **Min SDK**: 24 (Android 7.0)
- **Target SDK**: 36
- **Play Store URL**: `https://play.google.com/store/apps/details?id=com.minaezzat.onesteps`

## Next Steps

1. Generate production keystore
2. Update `build.gradle` with production signing config
3. Add privacy policy URL to `app.json`
4. Complete Play Console setup (screenshots, descriptions, etc.)
5. Generate release build and test
6. Submit to Play Store

