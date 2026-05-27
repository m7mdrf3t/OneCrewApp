#!/bin/bash

# Enhanced Stream Chat Token Endpoint Test Script
# Tests the endpoint and validates all required fields

set -e

echo "🧪 Testing Stream Chat Token Endpoint"
echo "======================================"
echo ""

BASE_URL="https://onecrew-backend-309236356616.us-central1.run.app"
EMAIL="ghoneem77@gmail.com"
PASSWORD="password123"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Login
echo "1️⃣  Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  echo "$LOGIN_RESPONSE" | jq .
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "   Token: ${TOKEN:0:50}..."
echo ""

# Step 2: Test chat token endpoint
echo "2️⃣  Testing /api/chat/token endpoint..."
CHAT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/chat/token" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$CHAT_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$CHAT_RESPONSE" | sed '$d')

echo "   HTTP Status: $HTTP_CODE"
echo ""
echo "   Response:"
echo "$RESPONSE_BODY" | jq .
echo ""

# Step 3: Validate response
echo "3️⃣  Validating response format..."
echo ""

SUCCESS=$(echo "$RESPONSE_BODY" | jq -r '.success // false')
USER_ID=$(echo "$RESPONSE_BODY" | jq -r '.data.user_id // empty')
HAS_TOKEN=$(echo "$RESPONSE_BODY" | jq -r '.data.token // empty')
HAS_API_KEY=$(echo "$RESPONSE_BODY" | jq -r '.data.api_key // empty')

VALIDATION_PASSED=true

# Check HTTP status
if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✅ HTTP Status: 200 OK${NC}"
else
  echo -e "${RED}❌ HTTP Status: $HTTP_CODE (expected 200)${NC}"
  VALIDATION_PASSED=false
fi

# Check success field
if [ "$SUCCESS" == "true" ]; then
  echo -e "${GREEN}✅ Success field: true${NC}"
else
  echo -e "${RED}❌ Success field: false (expected true)${NC}"
  ERROR_MSG=$(echo "$RESPONSE_BODY" | jq -r '.error // "Unknown error"')
  echo -e "${RED}   Error: $ERROR_MSG${NC}"
  VALIDATION_PASSED=false
fi

# Check token
if [ -n "$HAS_TOKEN" ] && [ "$HAS_TOKEN" != "null" ]; then
  TOKEN_LENGTH=${#HAS_TOKEN}
  echo -e "${GREEN}✅ Token present (length: $TOKEN_LENGTH)${NC}"
  if [[ "$HAS_TOKEN" =~ ^eyJ ]]; then
    echo -e "${GREEN}   Token format: Valid JWT${NC}"
  else
    echo -e "${YELLOW}   Token format: May not be valid JWT${NC}"
  fi
else
  echo -e "${RED}❌ Token missing from response${NC}"
  VALIDATION_PASSED=false
fi

# Check user_id
if [ -n "$USER_ID" ] && [ "$USER_ID" != "null" ]; then
  echo -e "${GREEN}✅ User ID present: $USER_ID${NC}"
  
  # Check format
  if [[ "$USER_ID" =~ ^onecrew_(user|company)_ ]]; then
    echo -e "${GREEN}   Format: Correct (onecrew_user_* or onecrew_company_*)${NC}"
    
    # Extract type
    if [[ "$USER_ID" =~ ^onecrew_user_ ]]; then
      echo -e "${GREEN}   Type: User${NC}"
    elif [[ "$USER_ID" =~ ^onecrew_company_ ]]; then
      echo -e "${GREEN}   Type: Company${NC}"
    fi
  else
    echo -e "${RED}   Format: Incorrect (should start with 'onecrew_user_' or 'onecrew_company_')${NC}"
    echo -e "${RED}   Current format: $USER_ID${NC}"
    VALIDATION_PASSED=false
  fi
else
  echo -e "${RED}❌ User ID missing from response${NC}"
  VALIDATION_PASSED=false
fi

# Check API key
if [ -n "$HAS_API_KEY" ] && [ "$HAS_API_KEY" != "null" ]; then
  echo -e "${GREEN}✅ API key present: $HAS_API_KEY${NC}"
  if [ "$HAS_API_KEY" == "gjs4e7pmvpum" ]; then
    echo -e "${GREEN}   API key matches expected value${NC}"
  else
    echo -e "${YELLOW}   API key value: $HAS_API_KEY${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  API key missing from response (optional but recommended)${NC}"
fi

echo ""
echo "======================================"
if [ "$VALIDATION_PASSED" == true ]; then
  echo -e "${GREEN}✅ All validations passed!${NC}"
  echo ""
  echo "The endpoint is working correctly and ready for frontend integration."
  exit 0
else
  echo -e "${RED}❌ Some validations failed${NC}"
  echo ""
  echo "Please check the errors above and verify:"
  echo "1. Backend is deployed with latest changes"
  echo "2. Environment variables are set correctly"
  echo "3. Stream Chat SDK is properly installed"
  exit 1
fi

