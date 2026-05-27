#!/bin/bash

# Script to implement Stream Chat token endpoint in backend
# Run this from the OneCrewApp directory

set -e

echo "🚀 Starting Stream Chat Token Endpoint Implementation"
echo ""

# Navigate to CS directory
cd /Users/aghone01/Documents/CS

# Check if OneCrewBE exists
if [ ! -d "OneCrewBE" ]; then
    echo "📦 Cloning OneCrewBE repository..."
    git clone https://github.com/m7mdrf3t/OneCrewBE.git
    cd OneCrewBE
else
    echo "📂 OneCrewBE repository found, updating..."
    cd OneCrewBE
    git fetch origin
    git checkout main
    git pull origin main
fi

# Create new branch
echo ""
echo "🌿 Creating new branch: feature/add-stream-chat-token-endpoint"
git checkout -b feature/add-stream-chat-token-endpoint

echo ""
echo "✅ Branch created successfully!"
echo "📍 Current branch: $(git branch --show-current)"
echo ""
echo "📝 Next steps:"
echo "1. Install stream-chat package"
echo "2. Create Stream Chat service"
echo "3. Add token endpoint to chat routes"
echo "4. Update environment variables"
echo ""
echo "Ready to proceed with implementation!"

