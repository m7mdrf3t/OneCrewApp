#!/bin/bash

# Quick Backend Test - Simple verification
# Tests the unread count endpoint and confirms it's working

BASE_URL="${BASE_URL:-https://onecrew-backend-staging-309236356616.us-central1.run.app}"
EMAIL="${EMAIL:-ghoneem77@gmail.com}"
PASSWORD="${PASSWORD:-password123}"

echo "🔍 Quick Backend Test"
echo "===================="
echo ""

# Step 1: Authenticate
echo "1. Authenticating..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Authentication failed"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Authenticated"
echo ""

# Step 2: Test Endpoint
echo "2. Testing unread count endpoint..."
echo "URL: ${BASE_URL}/api/chat/conversations/unread-count?profile_type=user"
echo ""

RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "${BASE_URL}/api/chat/conversations/unread-count?profile_type=user" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Status: $HTTP_CODE"
echo ""
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  UNREAD_COUNT=$(echo "$BODY" | grep -o '"unread_count":[0-9]*' | cut -d':' -f2)
  SUCCESS=$(echo "$BODY" | grep -o '"success":true' || echo "")
  
  if [ -n "$SUCCESS" ] && [ -n "$UNREAD_COUNT" ]; then
    echo "✅ Endpoint is working!"
    echo "✅ Unread count: $UNREAD_COUNT"
    echo ""
    echo "Backend endpoint is confirmed working!"
    exit 0
  else
    echo "⚠️  Response received but structure may be invalid"
    exit 1
  fi
else
  echo "❌ Endpoint returned error (HTTP $HTTP_CODE)"
  exit 1
fi
