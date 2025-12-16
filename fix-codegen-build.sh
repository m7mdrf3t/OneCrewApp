#!/bin/bash

echo "🔧 Fixing ReactCodegen build issues..."
echo ""

# Step 1: Clean build directories
echo "📦 Step 1: Cleaning build directories..."
cd "$(dirname "$0")"
rm -rf ios/build
rm -rf ~/Library/Developer/Xcode/DerivedData/OneCrew-*

# Step 2: Reinstall pods
echo "📦 Step 2: Reinstalling pods..."
cd ios
pod install
cd ..

# Step 3: Create build directory structure
echo "📦 Step 3: Creating build directory structure..."
mkdir -p ios/build/generated/ios/react/renderer/components
mkdir -p ios/build/generated/ios/safeareacontext
mkdir -p ios/build/generated/ios/rnworklets
mkdir -p ios/build/generated/ios/rnscreens

echo ""
echo "✅ Setup complete!"
echo ""
echo "📱 Next step: Run 'npx expo run:ios --device'"
echo "   The codegen will run automatically during the Xcode build."
echo ""







