#!/bin/bash

# Script to commit and push backend Stream Chat token endpoint fix

set -e

echo "🚀 Committing Stream Chat Token Endpoint Fix"
echo ""

cd /Users/aghone01/Documents/CS/OneCrew_BE/OneCrewBE

echo "📂 Current directory: $(pwd)"
echo ""

# Check git status
echo "📋 Checking git status..."
git status --short

echo ""
echo "🌿 Creating branch: feature/fix-stream-chat-token-endpoint"
git checkout -b feature/fix-stream-chat-token-endpoint 2>&1 || git checkout feature/fix-stream-chat-token-endpoint

echo ""
echo "📝 Staging changes..."
git add src/domains/chat/routes/chat.ts

echo ""
echo "💾 Committing changes..."
git commit -m "Fix Stream Chat token endpoint to return formatted user_id

- Format user_id as onecrew_user_{id} or onecrew_company_{id}
- Use formatted ID for token generation
- Support both STREAM_CHAT_API_KEY and STREAM_API_KEY env vars
- Fixes frontend connection issue"

echo ""
echo "📤 Pushing to remote..."
git push origin feature/fix-stream-chat-token-endpoint

echo ""
echo "✅ Done! Branch created and pushed."
echo "📍 Branch: feature/fix-stream-chat-token-endpoint"
echo ""
echo "📝 Next: Create Pull Request on GitHub to merge into main/develop"

