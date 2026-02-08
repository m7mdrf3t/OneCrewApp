#!/usr/bin/env bash
# Verify release keystore passwords before building. Run from project root or android/.
# Usage: export MYAPP_RELEASE_STORE_PASSWORD=... MYAPP_RELEASE_KEY_PASSWORD=...
#        ./android/verify-release-keystore.sh

set -e
KEYSTORE="${KEYSTORE:-/Users/aghone01/Documents/CS/OneCrewApp/@m7mdrf3t__one-crew.jks}"
ALIAS="${ALIAS:-19f57c08a1380abcaeff9638387c3a69}"

if [ -z "$MYAPP_RELEASE_STORE_PASSWORD" ] || [ -z "$MYAPP_RELEASE_KEY_PASSWORD" ]; then
  echo "Set env vars first:"
  echo "  export MYAPP_RELEASE_STORE_PASSWORD=your-store-password"
  echo "  export MYAPP_RELEASE_KEY_PASSWORD=your-key-password"
  exit 1
fi

if keytool -list -v -keystore "$KEYSTORE" -alias "$ALIAS" \
  -storepass "$MYAPP_RELEASE_STORE_PASSWORD" -keypass "$MYAPP_RELEASE_KEY_PASSWORD" >/dev/null 2>&1; then
  echo "Keystore password OK. You can run: cd android && ./gradlew bundleRelease"
  keytool -list -v -keystore "$KEYSTORE" -alias "$ALIAS" \
    -storepass "$MYAPP_RELEASE_STORE_PASSWORD" -keypass "$MYAPP_RELEASE_KEY_PASSWORD" 2>/dev/null | grep "SHA1:"
else
  echo "Keystore was tampered with, or password was incorrect."
  echo "Check: store password, key password, and that the alias is $ALIAS."
  exit 1
fi
