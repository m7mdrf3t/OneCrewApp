#!/bin/bash

# Script to install Google Cloud CLI on macOS
# Usage: ./install-gcloud.sh

set -e

echo "🔧 Installing Google Cloud CLI (gcloud)..."
echo ""

# Check if Homebrew is installed
if command -v brew &> /dev/null; then
    echo "✅ Homebrew detected. Using Homebrew installation (recommended)..."
    echo ""
    echo "Installing via Homebrew..."
    brew install --cask google-cloud-sdk
    
    echo ""
    echo "✅ Installation complete!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Restart your terminal or run: exec -l \$SHELL"
    echo "   2. Initialize gcloud: gcloud init"
    echo "   3. Authenticate: gcloud auth login"
    echo "   4. Set project: gcloud config set project cool-steps"
    echo ""
else
    echo "⚠️  Homebrew not found. Using official installer..."
    echo ""
    echo "Downloading and installing Google Cloud SDK..."
    echo ""
    
    # Download and run the official installer
    curl https://sdk.cloud.google.com | bash
    
    echo ""
    echo "✅ Installation complete!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Restart your terminal or run: exec -l \$SHELL"
    echo "   2. Initialize gcloud: gcloud init"
    echo "   3. Authenticate: gcloud auth login"
    echo "   4. Set project: gcloud config set project cool-steps"
    echo ""
    echo "Or manually download from: https://cloud.google.com/sdk/docs/install"
fi







