#!/bin/bash

# Fix gcloud Python path issue
# Usage: ./fix-gcloud-python.sh

set -e

echo "🔧 Fixing gcloud Python path issue..."
echo ""

# Check which Python versions are available
echo "Checking available Python versions..."
echo ""

# Check for Python 3.10+
PYTHON3_PATH=""
if command -v python3.13 &> /dev/null; then
    PYTHON3_PATH=$(which python3.13)
    echo "✅ Found Python 3.13 at: $PYTHON3_PATH"
elif command -v python3.12 &> /dev/null; then
    PYTHON3_PATH=$(which python3.12)
    echo "✅ Found Python 3.12 at: $PYTHON3_PATH"
elif command -v python3.11 &> /dev/null; then
    PYTHON3_PATH=$(which python3.11)
    echo "✅ Found Python 3.11 at: $PYTHON3_PATH"
elif command -v python3.10 &> /dev/null; then
    PYTHON3_PATH=$(which python3.10)
    echo "✅ Found Python 3.10 at: $PYTHON3_PATH"
elif command -v python3 &> /dev/null; then
    PYTHON3_PATH=$(which python3)
    PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}' | cut -d. -f1,2)
    echo "✅ Found Python $PYTHON_VERSION at: $PYTHON3_PATH"
    
    # Check if version is 3.10+
    MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
    MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
    if [ "$MAJOR" -lt 3 ] || ([ "$MAJOR" -eq 3 ] && [ "$MINOR" -lt 10 ]); then
        echo "⚠️  Warning: Python version is $PYTHON_VERSION (needs 3.10+)"
        echo "   gcloud may still work, but Python 3.9 will be deprecated soon"
    fi
else
    echo "❌ Error: No Python 3 found"
    echo "   Please install Python 3.10 or higher"
    exit 1
fi

echo ""
echo "Setting CLOUDSDK_PYTHON environment variable..."
export CLOUDSDK_PYTHON="$PYTHON3_PATH"

# Add to shell profile for persistence
SHELL_PROFILE=""
if [ -f "$HOME/.zshrc" ]; then
    SHELL_PROFILE="$HOME/.zshrc"
elif [ -f "$HOME/.bash_profile" ]; then
    SHELL_PROFILE="$HOME/.bash_profile"
elif [ -f "$HOME/.bashrc" ]; then
    SHELL_PROFILE="$HOME/.bashrc"
fi

if [ -n "$SHELL_PROFILE" ]; then
    # Check if already added
    if ! grep -q "CLOUDSDK_PYTHON" "$SHELL_PROFILE"; then
        echo "" >> "$SHELL_PROFILE"
        echo "# Google Cloud SDK Python path" >> "$SHELL_PROFILE"
        echo "export CLOUDSDK_PYTHON=\"$PYTHON3_PATH\"" >> "$SHELL_PROFILE"
        echo "✅ Added to $SHELL_PROFILE"
    else
        echo "ℹ️  CLOUDSDK_PYTHON already set in $SHELL_PROFILE"
    fi
fi

echo ""
echo "✅ Python path configured!"
echo ""
echo "Now try to reinstall gcloud components:"
echo "  gcloud components reinstall"
echo ""
echo "Or continue with authentication:"
echo "  gcloud auth login"
echo "  gcloud config set project cool-steps"
echo ""


