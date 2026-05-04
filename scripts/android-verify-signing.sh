#!/usr/bin/env bash
#
# Print the SHA-1 of the certificate that signed the app currently installed
# on the connected device/emulator. Use this to verify you added the correct
# SHA-1 in Google Cloud (Android OAuth client).
#
# Usage: ./scripts/android-verify-signing.sh
# Requires: adb; apksigner (Android SDK) or keytool (Java); device/emulator with app installed.
#

set -e
PACKAGE="com.minaezzat.onesteps"
APK_FILE="/tmp/onecrew-app.apk"

echo "Package: $PACKAGE"
echo ""

# Get APK path on device
PATH_LINE=$(adb shell pm path "$PACKAGE" 2>/dev/null | tr -d '\r')
if [ -z "$PATH_LINE" ]; then
  echo "App not installed on connected device. Install the app and try again."
  exit 1
fi
APK_PATH=$(echo "$PATH_LINE" | sed 's/^package://' | tr -d '\r' | tr -d ' ')
echo "Pulling APK from device..."
if ! adb pull "$APK_PATH" "$APK_FILE" 2>/dev/null; then
  echo "Failed to pull APK. Is the device/emulator connected?"
  exit 1
fi

echo "Certificate used to sign the INSTALLED app:"
echo "-------------------------------------------"

GOT_CERT=0

# 1. Prefer apksigner (handles v2/v3 signed APKs). Find it in Android SDK.
APKSIGNER=""
for root in "$ANDROID_HOME" "$ANDROID_SDK_ROOT" "$HOME/Library/Android/sdk"; do
  [ -z "$root" ] && continue
  APKSIGNER=$(find "$root/build-tools" -name apksigner -type f 2>/dev/null | head -1)
  [ -n "$APKSIGNER" ] && break
done

if [ -n "$APKSIGNER" ]; then
  OUT=$("$APKSIGNER" verify --print-certs "$APK_FILE" 2>/dev/null) || true
  if echo "$OUT" | grep -q "SHA-1 digest:"; then
    echo "$OUT" | grep -E "SHA-1 digest:|SHA-256 digest:"
    # apksigner prints "SHA-1 digest: 5e8f16..." or "5e 8f 16 ..."; Google Cloud wants "5E:8F:16:..."
    SHA1_RAW=$(echo "$OUT" | grep "SHA-1 digest:" | sed 's/.*SHA-1 digest: //' | tr -d ' ')
    if [ -n "$SHA1_RAW" ]; then
      SHA1_COLONS=$(echo "$SHA1_RAW" | sed 's/\(..\)/\1:/g' | sed 's/:$//' | tr '[:lower:]' '[:upper:]')
      echo ""
      echo "Use this SHA-1 in Google Cloud (Android OAuth client):"
      echo "  $SHA1_COLONS"
    fi
    GOT_CERT=1
  fi
fi

# 2. Fallback: unzip APK and use keytool on META-INF cert (v1 signing)
if [ $GOT_CERT -eq 0 ]; then
  UNZIP_DIR="/tmp/onecrew-app-apk-certs"
  rm -rf "$UNZIP_DIR"
  mkdir -p "$UNZIP_DIR"
  (cd "$UNZIP_DIR" && unzip -q -o "$APK_FILE" "META-INF/*.RSA" "META-INF/*.DSA" "META-INF/*.EC" 2>/dev/null) || true
  for cert in "$UNZIP_DIR"/META-INF/*.RSA "$UNZIP_DIR"/META-INF/*.DSA "$UNZIP_DIR"/META-INF/*.EC; do
    [ -f "$cert" ] || continue
    keytool -printcert -file "$cert" 2>/dev/null | grep -E "SHA1:|SHA256:"
    GOT_CERT=1
    break
  done
  rm -rf "$UNZIP_DIR"
fi

# 3. Fallback: keytool -printcert -jarfile (v1-signed APKs only)
if [ $GOT_CERT -eq 0 ]; then
  keytool -printcert -jarfile "$APK_FILE" 2>/dev/null | grep -E "SHA1:|SHA256:" && GOT_CERT=1
fi

if [ $GOT_CERT -eq 0 ]; then
  echo "Could not read certificate (APK may use v2/v3 signing; set ANDROID_HOME so apksigner is found)."
fi

echo "-------------------------------------------"
echo ""
echo "Use the SHA1 value above in Google Cloud Console (Android OAuth client)."
echo "Package name: $PACKAGE"
rm -f "$APK_FILE"
