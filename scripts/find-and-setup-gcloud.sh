#!/bin/bash

# Find and setup gcloud after installation
# Usage: ./find-and-setup-gcloud.sh

set -e

echo "🔍 Finding gcloud installation..."
echo ""

# Common installation paths
POSSIBLE_PATHS=(
    "/opt/homebrew/share/google-cloud-sdk/bin/gcloud"
    "/usr/local/share/google-cloud-sdk/bin/gcloud"
    "$HOME/google-cloud-sdk/bin/gcloud"
    "$HOME/.local/share/google-cloud-sdk/bin/gcloud"
    "/usr/share/google-cloud-sdk/bin/gcloud"
)

GCLOUD_PATH=""

# Check each possible path
for path in "${POSSIBLE_PATHS[@]}"; do
    if [ -f "$path" ]; then
        GCLOUD_PATH="$path"
        echo "✅ Found gcloud at: $GCLOUD_PATH"
        break
    fi
done

# If not found, try to find it
if [ -z "$GCLOUD_PATH" ]; then
    echo "🔍 Searching for gcloud..."
    GCLOUD_PATH=$(find /opt/homebrew /usr/local $HOME -name "gcloud" -type f 2>/dev/null | head -1)
    
    if [ -n "$GCLOUD_PATH" ]; then
        echo "✅ Found gcloud at: $GCLOUD_PATH"
    else
        echo "❌ gcloud not found. It may not be fully installed."
        echo ""
        echo "Let's try to complete the installation..."
        echo ""
        
        # Try to find the install script
        if [ -d "/opt/homebrew/share/google-cloud-sdk" ]; then
            echo "Found Google Cloud SDK directory. Running install script..."
            /opt/homebrew/share/google-cloud-sdk/install.sh
        elif [ -d "$HOME/google-cloud-sdk" ]; then
            echo "Found Google Cloud SDK directory. Running install script..."
            $HOME/google-cloud-sdk/install.sh
        else
            echo "❌ Google Cloud SDK not found. Please reinstall:"
            echo "   brew install --cask google-cloud-sdk"
            echo "   OR"
            echo "   curl https://sdk.cloud.google.com | bash"
            exit 1
        fi
    fi
fi

if [ -n "$GCLOUD_PATH" ]; then
    # Get the directory containing gcloud
    GCLOUD_DIR=$(dirname "$GCLOUD_PATH")
    
    echo ""
    echo "📋 Adding gcloud to PATH..."
    
    # Add to PATH for current session
    export PATH="$GCLOUD_DIR:$PATH"
    
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
        if ! grep -q "$GCLOUD_DIR" "$SHELL_PROFILE"; then
            echo "" >> "$SHELL_PROFILE"
            echo "# Google Cloud SDK" >> "$SHELL_PROFILE"
            echo "export PATH=\"$GCLOUD_DIR:\$PATH\"" >> "$SHELL_PROFILE"
            echo "✅ Added to $SHELL_PROFILE"
        else
            echo "ℹ️  PATH already configured in $SHELL_PROFILE"
        fi
    fi
    
    # Set Python path if not already set
    if [ -z "$CLOUDSDK_PYTHON" ]; then
        PYTHON3_PATH=$(which python3)
        export CLOUDSDK_PYTHON="$PYTHON3_PATH"
        echo "✅ Set CLOUDSDK_PYTHON=$PYTHON3_PATH"
        
        if [ -n "$SHELL_PROFILE" ] && ! grep -q "CLOUDSDK_PYTHON" "$SHELL_PROFILE"; then
            echo "" >> "$SHELL_PROFILE"
            echo "# Google Cloud SDK Python path" >> "$SHELL_PROFILE"
            echo "export CLOUDSDK_PYTHON=\"$PYTHON3_PATH\"" >> "$SHELL_PROFILE"
        fi
    fi
    
    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "Testing gcloud..."
    "$GCLOUD_PATH" --version
    
    echo ""
    echo "📝 Next steps:"
    echo "   1. Restart your terminal or run: source $SHELL_PROFILE"
    echo "   2. Authenticate: gcloud auth login"
    echo "   3. Set project: gcloud config set project cool-steps"
    echo "   4. Update secrets: ./update-staging-secrets.sh"
fi








