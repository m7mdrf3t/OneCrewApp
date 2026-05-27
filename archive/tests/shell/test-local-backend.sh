#!/bin/bash

# Test Stream Chat Token Endpoint - Local Backend
# Backend running on http://localhost:3000

echo "🧪 Testing Stream Chat Token Endpoint (Local Backend)"
echo "======================================================"
echo ""

BASE_URL="http://localhost:3000"
EMAIL="ghoneem77@gmail.com"
PASSWORD="password123"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Login
echo "1️⃣  Logging in to local backend..."
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

if [ "$SUCCESS" == "true" ]; then
  echo -e "${GREEN}✅ Endpoint working!${NC}"
  if [[ "$USER_ID" =~ ^onecrew_(user|company)_ ]]; then
    echo -e "${GREEN}✅ User ID format correct: $USER_ID${NC}"
    echo ""
    echo -e "${GREEN}🎉 Backend fix is working!${NC}"
    echo "   You can now test on iOS simulator."
  else
    echo -e "${YELLOW}⚠️  User ID format: $USER_ID${NC}"
    echo "   Expected: onecrew_user_... or onecrew_company_..."
  fi
else
  echo -e "${RED}❌ Endpoint error${NC}"
  ERROR=$(echo "$RESPONSE" | jq -r '.error // "Unknown error"')
  echo "   Error: $ERROR"
fi

