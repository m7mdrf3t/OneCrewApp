# Android Release APK Build

## Version 1.3.8 (Build 23)

**Date:** January 28, 2026

## Build Profiles

| Profile | Output | Use Case |
|---------|--------|----------|
| `production-apk` | APK | Direct install, sideload, internal distribution |
| `production` | AAB | Google Play Console (recommended for store) |

## Build APK for Release

```bash
# Login to EAS (if not already)
eas login

# Build production APK (run interactively - first time may prompt for keystore setup)
eas build --platform android --profile production-apk
```

**Note:** Run without `--non-interactive` so EAS can prompt for credential setup if needed.  
The APK will be built in the cloud and a download link will be provided when complete.

## Build AAB for Play Store

For Google Play Console submission (recommended):

```bash
eas build --platform android --profile production
```

## Version Info

- **Version:** 1.3.8
- **Version Code:** 23
- **Package:** com.minaezzat.onesteps

## Submit to Play Console

After the build completes:

```bash
# Submit AAB to Play Console (requires Play Store credentials)
eas submit --platform android --profile production --latest
```

## Local APK Build

To build the release APK locally (no EAS):

```bash
npm run build:apk
```

Or directly:

```bash
cd android && ./gradlew assembleRelease
```

**Output:** `android/app/build/outputs/apk/release/app-release.apk`

**Note:** First build may take 10–15 minutes. Local build uses the debug keystore. For production signing (Play Store), configure a release keystore in `android/app/build.gradle` or use EAS build.
