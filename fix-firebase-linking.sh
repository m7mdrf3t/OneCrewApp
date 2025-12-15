#!/bin/bash

echo "🔧 Fixing Firebase Native Module Linking..."
echo ""

# Step 1: Clean iOS build artifacts
echo "📦 Step 1: Cleaning iOS build artifacts..."
cd ios
rm -rf Pods
rm -rf Podfile.lock
rm -rf build
rm -rf ~/Library/Developer/Xcode/DerivedData/*
cd ..

# Step 2: Clean node modules (optional but recommended)
echo "📦 Step 2: Cleaning node modules..."
read -p "Do you want to reinstall node_modules? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf node_modules
    npm install
fi

# Step 3: Reinstall pods
echo "📦 Step 3: Reinstalling CocoaPods..."
cd ios
pod deintegrate || true
pod install --repo-update
cd ..

# Step 4: Verify Firebase pods
echo "📦 Step 4: Verifying Firebase pods are installed..."
cd ios
if pod list | grep -q "Firebase"; then
    echo "✅ Firebase pods found:"
    pod list | grep Firebase
else
    echo "❌ Firebase pods NOT found!"
    echo "   This indicates a linking issue."
    exit 1
fi
cd ..

# Step 5: Rebuild
echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📱 Next steps:"
echo "   1. Run: npx expo run:ios --device --clean"
echo "   2. Check console logs for Firebase module loading"
echo "   3. Look for: '✅ [Firebase] Successfully loaded Firebase messaging module'"
echo ""






