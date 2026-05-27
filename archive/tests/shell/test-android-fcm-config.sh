#!/usr/bin/env bash
#
# Local Android FCM config check (no API keys needed).
# Run before building the APK to ensure FCM-related files and manifest are set.
#
# Usage: ./test-android-fcm-config.sh
#

set -e

EXPECTED_PACKAGE="com.minaezzat.onesteps"
ANDROID_APP="android/app"
FAIL=0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Android FCM config (local)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. google-services.json
if [ ! -f "$ANDROID_APP/google-services.json" ]; then
  echo "❌ $ANDROID_APP/google-services.json not found."
  echo "   Download from Firebase Console → Project settings → Your apps → Android app."
  FAIL=1
else
  echo "✅ google-services.json exists"
  PROJECT_ID=$(grep -o '"project_id"[[:space:]]*:[[:space:]]*"[^"]*"' "$ANDROID_APP/google-services.json" | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
  PACKAGE=$(grep -o '"package_name"[[:space:]]*:[[:space:]]*"[^"]*"' "$ANDROID_APP/google-services.json" | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
  if [ -n "$PROJECT_ID" ]; then
    echo "   project_id: $PROJECT_ID"
  fi
  if [ -n "$PACKAGE" ]; then
    if [ "$PACKAGE" = "$EXPECTED_PACKAGE" ]; then
      echo "   package_name: $PACKAGE ✅"
    else
      echo "   package_name: $PACKAGE (expected $EXPECTED_PACKAGE) ⚠️"
      FAIL=1
    fi
  fi
fi
echo ""

# 2. AndroidManifest: POST_NOTIFICATIONS
MANIFEST="$ANDROID_APP/src/main/AndroidManifest.xml"
if [ ! -f "$MANIFEST" ]; then
  echo "❌ $MANIFEST not found."
  FAIL=1
elif grep -q "POST_NOTIFICATIONS" "$MANIFEST"; then
  echo "✅ AndroidManifest: POST_NOTIFICATIONS declared"
else
  echo "❌ AndroidManifest: POST_NOTIFICATIONS not found (required for Android 13+)."
  FAIL=1
fi

# 3. AndroidManifest: FCM notification icon/color
if [ -f "$MANIFEST" ]; then
  if grep -q "com.google.firebase.messaging.default_notification_icon" "$MANIFEST" && \
     grep -q "com.google.firebase.messaging.default_notification_color" "$MANIFEST"; then
    echo "✅ AndroidManifest: FCM default notification icon and color set"
  else
    echo "⚠️  AndroidManifest: FCM default_notification_icon or default_notification_color missing (optional but recommended)"
  fi
fi
echo ""

# 4. build.gradle: google-services plugin
APP_GRADLE="$ANDROID_APP/build.gradle"
ROOT_GRADLE="android/build.gradle"
if grep -q "com.google.gms.google-services" "$APP_GRADLE" 2>/dev/null; then
  echo "✅ app/build.gradle: google-services plugin applied"
else
  echo "❌ app/build.gradle: apply plugin \"com.google.gms.google-services\" not found."
  FAIL=1
fi
if [ -f "$ROOT_GRADLE" ] && grep -q "google-services" "$ROOT_GRADLE"; then
  echo "✅ android/build.gradle: google-services classpath present"
else
  echo "❌ android/build.gradle: google-services classpath not found."
  FAIL=1
fi
echo ""

if [ $FAIL -eq 0 ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ Local Android FCM config looks good."
  echo "   Next: run Stream push check and Firebase test (see FCM_ANDROID_CONFIG_AND_TESTS.md)"
  echo "   Then: npm run build:apk"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
else
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌ Fix the issues above before building the APK."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi
