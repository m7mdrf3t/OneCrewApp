#!/bin/bash

# Script to create a production keystore for Android release builds
# This will prompt you for keystore password and certificate information

echo "🔐 Creating Production Keystore for Release Builds"
echo ""
echo "You'll be prompted for:"
echo "  - Keystore password (save this securely!)"
echo "  - Key password (can be same as keystore password)"
echo "  - Certificate information (name, organization, etc.)"
echo ""

keytool -genkeypair -v -storetype PKCS12 \
  -keystore release.keystore \
  -alias release-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Keystore created successfully!"
    echo ""
    echo "📝 IMPORTANT: Save your keystore password securely!"
    echo "   You'll need it for all future app updates."
    echo ""
    echo "📁 Keystore location: android/app/release.keystore"
    echo ""
    echo "Next steps:"
    echo "  1. Set environment variables:"
    echo "     export KEYSTORE_PASSWORD='your-password'"
    echo "     export KEY_PASSWORD='your-password'"
    echo "  2. Or update android/app/build.gradle with passwords directly"
    echo "  3. Run: cd android && ./gradlew bundleRelease"
else
    echo ""
    echo "❌ Failed to create keystore"
    exit 1
fi

