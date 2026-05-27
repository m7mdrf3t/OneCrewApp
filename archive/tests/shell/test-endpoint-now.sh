#!/bin/bash

# Quick Endpoint Test Script
# Tests the Stream Chat token endpoint

echo "🔐 Step 1: Logging in..."
TOKEN=$(curl -s -X POST https://onecrew-backend-309236356616.us-central1.run.app/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"ghoneem77@gmail.com","password":"password123"}' \
  | jq -r '.data.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Login successful"
echo ""

echo "💬 Step 2: Testing /api/chat/token endpoint..."
echo ""
RESPONSE=$(curl -s -X POST https://onecrew-backend-309236356616.us-central1.run.app/api/chat/token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$RESPONSE" | jq .
echo ""

# Check response
SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
USER_ID=$(echo "$RESPONSE" | jq -r '.data.user_id // empty')

if [ "$SUCCESS" == "true" ]; then
  echo "✅ Endpoint working!"
  if [[ "$USER_ID" =~ ^onecrew_(user|company)_ ]]; then
    echo "✅ User ID format correct: $USER_ID"
    echo ""
    echo "🎉 Backend fix is deployed and working!"
    echo "   You can now test on iOS simulator."
  else
    echo "⚠️  User ID format: $USER_ID"
    echo "   Expected format: onecrew_user_... or onecrew_company_..."
  fi
else
  echo "❌ Endpoint error"
  ERROR=$(echo "$RESPONSE" | jq -r '.error // "Unknown error"')
  echo "   Error: $ERROR"
  echo ""
  if [[ "$ERROR" == *"not found"* ]]; then
    echo "💡 Backend fix not deployed yet. Wait for deployment."
  fi
fi

