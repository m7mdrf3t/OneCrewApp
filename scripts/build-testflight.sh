#!/bin/bash

# Build iOS app for TestFlight
# Usage: ./build-testflight.sh

set -e

echo "🚀 Building iOS app for TestFlight..."
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ Error: EAS CLI is not installed"
    echo "   Install it with: npm install -g eas-cli"
    exit 1
fi

# Check if logged in to Expo
if ! eas whoami &> /dev/null; then
    echo "❌ Error: Not logged in to Expo"
    echo "   Login with: eas login"
    exit 1
fi

echo "✅ EAS CLI ready"
echo ""

# Verify version configuration
echo "📋 Verifying version configuration..."
CURRENT_VERSION=$(grep -E '"version":' app.json | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/')
CURRENT_BUILD=$(grep -E '"buildNumber":' app.json | head -1 | sed 's/.*"buildNumber": *"\([^"]*\)".*/\1/')
RUNTIME_VERSION=$(grep -E '"runtimeVersion":' app.json | head -1 | sed 's/.*"runtimeVersion": *"\([^"]*\)".*/\1/')

echo "   Version: $CURRENT_VERSION"
echo "   Build Number: $CURRENT_BUILD"
echo "   Runtime Version: $RUNTIME_VERSION"
echo "   Version Source: local (from app.json)"
echo ""

if [ -z "$CURRENT_VERSION" ]; then
    echo "❌ Error: Could not read version from app.json"
    exit 1
fi

# Verify eas.json uses local version source
if ! grep -q '"appVersionSource": "local"' eas.json; then
    echo "⚠️  Warning: eas.json may not be using local version source"
    echo "   Expected: \"appVersionSource\": \"local\""
fi

echo "✅ Version configuration verified"
echo ""

# Ask user if they want to submit automatically
read -p "Do you want to automatically submit to TestFlight after build? (y/N): " -n 1 -r
echo ""

SUBMIT_AFTER_BUILD=false
if [[ $REPLY =~ ^[Yy]$ ]]; then
    SUBMIT_AFTER_BUILD=true
    echo "✅ Will submit to TestFlight automatically after build completes"
else
    echo "ℹ️  Build only (you can submit manually later with: eas submit --platform ios --latest)"
fi

echo ""
echo "📦 Starting production build..."
echo "   Version: $CURRENT_VERSION"
echo "   Build Number: $CURRENT_BUILD (will auto-increment)"
echo "   This will take 15-30 minutes"
echo ""

# Build for production (uses local version from app.json via eas.json config)
if eas build --platform ios --profile production; then
    echo ""
    echo "✅ Build completed successfully!"
    echo ""
    
    if [ "$SUBMIT_AFTER_BUILD" = true ]; then
        echo "📤 Submitting to TestFlight..."
        echo ""
        
        if eas submit --platform ios --latest; then
            echo ""
            echo "✅ Submitted to TestFlight successfully!"
            echo ""
            echo "📝 Next steps:"
            echo "   1. Wait for processing (10-30 minutes)"
            echo "   2. Go to App Store Connect → TestFlight"
            echo "   3. Add testers and configure testing"
            echo "   4. Test the build on TestFlight"
        else
            echo ""
            echo "⚠️  Build completed but submission failed"
            echo "   You can submit manually with:"
            echo "   eas submit --platform ios --latest"
        fi
    else
        echo "📝 Next steps:"
        echo "   1. Review build at: https://expo.dev"
        echo "   2. Submit to TestFlight: eas submit --platform ios --latest"
        echo "   3. Or download .ipa and upload manually"
    fi
else
    echo ""
    echo "❌ Build failed"
    echo "   Check build logs at: https://expo.dev"
    echo "   Fix any errors and try again"
    exit 1
fi


