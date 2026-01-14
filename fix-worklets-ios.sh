#!/bin/bash

# Fix Worklets Version Mismatch on iOS
# This script performs a complete clean rebuild

echo "🧹 Cleaning iOS build artifacts..."

# Stop any running Metro bundler
pkill -f "expo start" || true
pkill -f "metro" || true

# Clean iOS build directories
cd /Users/aghone01/Documents/CS/OneCrewApp
rm -rf ios/build
rm -rf ios/DerivedData
rm -rf ~/Library/Developer/Xcode/DerivedData/*/Steps* 2>/dev/null || true

# Clean pods
cd ios
rm -rf Pods
rm -rf Podfile.lock

echo "📦 Reinstalling pods..."
pod install

echo "🔨 Building iOS app with clean cache..."
cd ..

# Build with clean flag
npx expo run:ios --clean

echo "✅ Done! The app should now build with the correct Worklets version (0.6.1)"

