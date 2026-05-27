#!/bin/bash

# Test Stream Chat Token Endpoint - New Credentials
# Backend: http://172.23.179.222:3000
# API Key: j8yy2mzarh3n

echo "🧪 Testing Stream Chat Token Endpoint (New Credentials)"
echo "========================================================"
echo ""

BASE_URL="http://172.23.179.222:3000"
EMAIL="ghoneem77@gmail.com"
PASSWORD="password123"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

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
RESPONSE=$(curl -s -X POST "${BASE_URL}/api/chat/token" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$RESPONSE" | jq .
echo ""

# Step 3: Validate
SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
USER_ID=$(echo "$RESPONSE" | jq -r '.data.user_id // empty')
TOKEN_VALUE=$(echo "$RESPONSE" | jq -r '.data.token // empty')
API_KEY=$(echo "$RESPONSE" | jq -r '.data.api_key // empty')

if [ "$SUCCESS" == "true" ]; then
  echo -e "${GREEN}✅ Endpoint working!${NC}"
  
  if [[ "$USER_ID" =~ ^onecrew_(user|company)_ ]]; then
    echo -e "${GREEN}✅ User ID format correct: $USER_ID${NC}"
  else
    echo -e "${YELLOW}⚠️  User ID format: $USER_ID${NC}"
    echo "   Expected: onecrew_user_... or onecrew_company_..."
  fi
  
  if [ -n "$TOKEN_VALUE" ]; then
    TOKEN_LENGTH=${#TOKEN_VALUE}
    echo -e "${GREEN}✅ Token present (length: $TOKEN_LENGTH)${NC}"
  else
    echo -e "${RED}❌ Token missing${NC}"
  fi
  
  if [ "$API_KEY" == "j8yy2mzarh3n" ]; then
    echo -e "${GREEN}✅ API key correct: $API_KEY${NC}"
  else
    echo -e "${YELLOW}⚠️  API key: $API_KEY${NC}"
    echo "   Expected: j8yy2mzarh3n"
  fi
  
  echo ""
  echo -e "${GREEN}🎉 Backend is ready!${NC}"
  echo "   You can now test in iOS simulator."
else
  echo -e "${RED}❌ Endpoint error${NC}"
  ERROR=$(echo "$RESPONSE" | jq -r '.error // "Unknown error"')
  echo "   Error: $ERROR"
fi

