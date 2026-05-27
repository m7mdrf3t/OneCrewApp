#!/bin/bash

# Test Stream Chat Token Endpoint

echo "🧪 Testing Stream Chat Token Endpoint"
echo ""

BASE_URL="https://onecrew-backend-309236356616.us-central1.run.app"
EMAIL="ghoneem77@gmail.com"
PASSWORD="password123"

echo "1️⃣ Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ Login failed"
  echo "$LOGIN_RESPONSE" | jq .
  exit 1
fi

echo "✅ Login successful"
echo "   Token: ${TOKEN:0:50}..."
echo ""

echo "2️⃣ Testing /api/chat/token endpoint..."
CHAT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/chat/token" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "$CHAT_RESPONSE" | jq .

echo ""
echo "3️⃣ Checking response format..."

SUCCESS=$(echo "$CHAT_RESPONSE" | jq -r '.success // false')
USER_ID=$(echo "$CHAT_RESPONSE" | jq -r '.data.user_id // empty')
HAS_TOKEN=$(echo "$CHAT_RESPONSE" | jq -r '.data.token // empty')
HAS_API_KEY=$(echo "$CHAT_RESPONSE" | jq -r '.data.api_key // empty')

if [ "$SUCCESS" == "true" ]; then
  echo "✅ Endpoint returned success"
  
  if [ -n "$USER_ID" ]; then
    if [[ "$USER_ID" == onecrew_* ]]; then
      echo "✅ User ID is correctly formatted: $USER_ID"
    else
      echo "⚠️  User ID format issue: $USER_ID (should start with 'onecrew_')"
    fi
  else
    echo "❌ User ID missing from response"
  fi
  
  if [ -n "$HAS_TOKEN" ]; then
    echo "✅ Token present in response"
  else
    echo "❌ Token missing from response"
  fi
  
  if [ -n "$HAS_API_KEY" ]; then
    echo "✅ API key present in response"
  else
    echo "⚠️  API key missing from response"
  fi
else
  echo "❌ Endpoint returned error"
  ERROR=$(echo "$CHAT_RESPONSE" | jq -r '.error // "Unknown error"')
  echo "   Error: $ERROR"
fi

