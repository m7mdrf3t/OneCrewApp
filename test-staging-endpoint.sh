#!/bin/bash

# Script to test the Stream Chat token endpoint on staging
# Usage: ./test-staging-endpoint.sh

set -e

STAGING_URL="https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app"
EMAIL="ghoneem77@gmail.com"
PASSWORD="password123"

echo "🧪 Testing Stream Chat token endpoint on staging..."
echo "URL: $STAGING_URL"
echo ""

# Step 1: Login to get JWT token
echo "1️⃣ Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$STAGING_URL/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Check if login was successful
if echo "$LOGIN_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
    if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
        echo "❌ Error: Failed to get token from login response"
        echo "Response: $LOGIN_RESPONSE"
        exit 1
    fi
    echo "✅ Login successful"
else
    echo "❌ Login failed"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

# Step 2: Test token endpoint
echo ""
echo "2️⃣ Testing /api/chat/token endpoint..."
TOKEN_RESPONSE=$(curl -s -X POST "$STAGING_URL/api/chat/token" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

# Check response
echo ""
echo "Response:"
echo "$TOKEN_RESPONSE" | jq .

# Verify response structure
if echo "$TOKEN_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo ""
    echo "✅ Endpoint is working!"
    
    # Check for required fields
    USER_ID=$(echo "$TOKEN_RESPONSE" | jq -r '.data.user_id // empty')
    API_KEY=$(echo "$TOKEN_RESPONSE" | jq -r '.data.api_key // empty')
    TOKEN_VALUE=$(echo "$TOKEN_RESPONSE" | jq -r '.data.token // empty')
    
    echo ""
    echo "📋 Response Details:"
    echo "  - success: true ✅"
    
    if [ -n "$USER_ID" ]; then
        if [[ "$USER_ID" == onecrew_user_* ]] || [[ "$USER_ID" == onecrew_company_* ]]; then
            echo "  - user_id: $USER_ID ✅ (correctly formatted)"
        else
            echo "  - user_id: $USER_ID ⚠️  (not in expected format)"
        fi
    else
        echo "  - user_id: MISSING ❌"
    fi
    
    if [ -n "$API_KEY" ]; then
        if [ "$API_KEY" == "j8yy2mzarh3n" ]; then
            echo "  - api_key: $API_KEY ✅ (correct)"
        else
            echo "  - api_key: $API_KEY ⚠️  (unexpected value)"
        fi
    else
        echo "  - api_key: MISSING ❌"
    fi
    
    if [ -n "$TOKEN_VALUE" ]; then
        echo "  - token: ${TOKEN_VALUE:0:20}... ✅ (present)"
    else
        echo "  - token: MISSING ❌"
    fi
    
    echo ""
    echo "✅ All checks passed! Staging backend is ready."
    echo ""
    echo "📝 Next steps:"
    echo "   1. Update frontend baseUrl to staging"
    echo "   2. Test Stream Chat connection in the app"
    echo "   3. Test creating conversations"
    echo "   4. Test sending messages"
    
elif echo "$TOKEN_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR=$(echo "$TOKEN_RESPONSE" | jq -r '.error')
    echo ""
    echo "❌ Endpoint returned an error:"
    echo "   $ERROR"
    
    if echo "$ERROR" | grep -q "404\|not found"; then
        echo ""
        echo "🔧 Fix: The endpoint is not deployed. Follow STAGING_DEPLOYMENT_GUIDE.md"
    elif echo "$ERROR" | grep -q "API key\|STREAM"; then
        echo ""
        echo "🔧 Fix: Stream Chat secrets are not configured. Run: ./update-staging-secrets.sh"
    fi
    
    exit 1
else
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$STAGING_URL/api/chat/token" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json")
    
    echo ""
    echo "❌ Unexpected response (HTTP $HTTP_CODE)"
    echo "   Response: $TOKEN_RESPONSE"
    exit 1
fi



