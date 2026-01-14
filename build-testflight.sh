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
echo "   This will take 15-30 minutes"
echo ""

# Build for production
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


