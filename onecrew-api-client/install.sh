#!/bin/bash

# OneCrew API Client Installation Script

echo "🚀 Installing OneCrew API Client..."

# Check if we're in a React Native/Expo project
if [ ! -f "package.json" ]; then
    echo "❌ Error: No package.json found. Please run this script from your React Native/Expo project root."
    exit 1
fi

# Check if it's an Expo project
if [ ! -f "app.json" ] && [ ! -f "expo.json" ]; then
    echo "⚠️  Warning: This doesn't appear to be an Expo project. Some features may not work."
fi

# Install required dependencies
echo "📦 Installing required dependencies..."

# Install AsyncStorage for React Native
if ! npm list @react-native-async-storage/async-storage > /dev/null 2>&1; then
    echo "Installing @react-native-async-storage/async-storage..."
    npm install @react-native-async-storage/async-storage
fi

# Install expo-secure-store
if ! npm list expo-secure-store > /dev/null 2>&1; then
    echo "Installing expo-secure-store..."
    npx expo install expo-secure-store
fi

# Install the OneCrew API Client
echo "Installing onecrew-api-client..."
npm install ./onecrew-api-client

echo "✅ OneCrew API Client installed successfully!"
echo ""
echo "📚 Next steps:"
echo "1. Import the API client in your app:"
echo "   import OneCrewApi from 'onecrew-api-client';"
echo ""
echo "2. Initialize the API client:"
echo "   const api = new OneCrewApi('https://your-api-domain.com');"
echo "   await api.initialize();"
echo ""
echo "3. Check out the examples in onecrew-api-client/examples/ for more usage patterns"
echo ""
echo "🎉 Happy coding!"
