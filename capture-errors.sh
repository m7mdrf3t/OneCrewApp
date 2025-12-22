#!/bin/bash

echo "📱 iOS Error Capture Script"
echo "============================"
echo ""
echo "This script will help capture iOS console errors."
echo ""
echo "Option 1: Capture from React Native logs"
echo "  Press Ctrl+C to stop after capturing errors"
echo ""
read -p "Start capturing? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📝 Capturing iOS logs... (Press Ctrl+C to stop)"
    echo "📝 Errors will be saved to ios_errors.log"
    echo ""
    npx react-native log-ios 2>&1 | tee ios_errors.log
else
    echo ""
    echo "Manual methods:"
    echo "1. Check Metro bundler console (terminal where expo start is running)"
    echo "2. Run: npx react-native log-ios"
    echo "3. Check Xcode console (if running from Xcode)"
    echo "4. iOS Simulator > Device > Console"
    echo ""
    echo "Please copy the error messages and share them."
fi

