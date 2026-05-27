#!/bin/bash

# Test StreamChat Token Endpoint
# This script tests the backend token endpoint to verify it returns the correct user ID format
# for both user and company profiles

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app}"
EMAIL="${EMAIL:-m7mdrf3t0@gmail.com}"
PASSWORD="${PASSWORD:-your_password_here}"

echo -e "${BLUE}🧪 Testing StreamChat Token Endpoint${NC}"
echo "=========================================="
echo ""

# Step 1: Login to get JWT token
echo -e "${YELLOW}📡 Step 1: Authenticating...${NC}"
echo "Logging in as ${EMAIL}..."
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to connect to server${NC}"
  exit 1
fi

# Extract token from response
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed. Response:${NC}"
  echo "$LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Step 2: Test token endpoint (should return user token)
echo -e "${YELLOW}📡 Step 2: Testing token endpoint (User Profile)${NC}"
echo "Calling GET /api/chat/token..."
echo ""

TOKEN_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/chat/token" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to call token endpoint${NC}"
  exit 1
fi

echo "Response:"
echo "$TOKEN_RESPONSE" | jq . 2>/dev/null || echo "$TOKEN_RESPONSE"
echo ""

# Check if response is valid
SUCCESS=$(echo "$TOKEN_RESPONSE" | grep -o '"success":true' || echo "")
USER_ID=$(echo "$TOKEN_RESPONSE" | grep -o '"user_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$SUCCESS" ]; then
  echo -e "${RED}❌ Token endpoint returned error${NC}"
  exit 1
fi

if [ -z "$USER_ID" ]; then
  echo -e "${RED}❌ No user_id in response${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Token endpoint working${NC}"
echo "User ID: ${USER_ID}"
echo ""

# Verify user ID format
if [[ "$USER_ID" == onecrew_user_* ]]; then
  echo -e "${GREEN}✅ User ID format correct: ${USER_ID}${NC}"
elif [[ "$USER_ID" == onecrew_company_* ]]; then
  echo -e "${YELLOW}⚠️  User ID is company format (expected user): ${USER_ID}${NC}"
else
  echo -e "${RED}❌ User ID format incorrect: ${USER_ID}${NC}"
  echo "Expected format: onecrew_user_{userId} or onecrew_company_{companyId}"
fi
echo ""

# Step 3: Test with company profile (if company ID is provided)
if [ -n "$COMPANY_ID" ]; then
  echo -e "${YELLOW}📡 Step 3: Testing token endpoint (Company Profile)${NC}"
  echo "Company ID: ${COMPANY_ID}"
  echo "Testing different methods to get company token..."
  echo ""
  
  # Method 1: Query parameter
  echo -e "${BLUE}Method 1: Query parameter (company_id)${NC}"
  COMPANY_TOKEN_RESPONSE1=$(curl -s -X GET "${BASE_URL}/api/chat/token?company_id=${COMPANY_ID}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json")
  
  echo "Response:"
  echo "$COMPANY_TOKEN_RESPONSE1" | jq . 2>/dev/null || echo "$COMPANY_TOKEN_RESPONSE1"
  echo ""
  
  COMPANY_USER_ID1=$(echo "$COMPANY_TOKEN_RESPONSE1" | grep -o '"user_id":"[^"]*' | cut -d'"' -f4)
  
  # Method 2: Header
  echo -e "${BLUE}Method 2: Header (X-Company-Id)${NC}"
  COMPANY_TOKEN_RESPONSE2=$(curl -s -X GET "${BASE_URL}/api/chat/token" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -H "X-Company-Id: ${COMPANY_ID}")
  
  echo "Response:"
  echo "$COMPANY_TOKEN_RESPONSE2" | jq . 2>/dev/null || echo "$COMPANY_TOKEN_RESPONSE2"
  echo ""
  
  COMPANY_USER_ID2=$(echo "$COMPANY_TOKEN_RESPONSE2" | grep -o '"user_id":"[^"]*' | cut -d'"' -f4)
  
  # Method 3: POST with body
  echo -e "${BLUE}Method 3: POST with body${NC}"
  COMPANY_TOKEN_RESPONSE3=$(curl -s -X POST "${BASE_URL}/api/chat/token" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"company_id\":\"${COMPANY_ID}\"}")
  
  echo "Response:"
  echo "$COMPANY_TOKEN_RESPONSE3" | jq . 2>/dev/null || echo "$COMPANY_TOKEN_RESPONSE3"
  echo ""
  
  COMPANY_USER_ID3=$(echo "$COMPANY_TOKEN_RESPONSE3" | grep -o '"user_id":"[^"]*' | cut -d'"' -f4)
  
  # Check which method worked
  if [[ "$COMPANY_USER_ID1" == onecrew_company_* ]]; then
    echo -e "${GREEN}✅ Method 1 (query param) worked! Company ID: ${COMPANY_USER_ID1}${NC}"
  elif [[ "$COMPANY_USER_ID2" == onecrew_company_* ]]; then
    echo -e "${GREEN}✅ Method 2 (header) worked! Company ID: ${COMPANY_USER_ID2}${NC}"
  elif [[ "$COMPANY_USER_ID3" == onecrew_company_* ]]; then
    echo -e "${GREEN}✅ Method 3 (POST body) worked! Company ID: ${COMPANY_USER_ID3}${NC}"
  else
    echo -e "${RED}❌ None of the methods returned a company user_id${NC}"
    echo "This suggests the backend doesn't support company profile tokens yet."
    echo "Backend needs to be updated to accept profile type context."
  fi
  echo ""
fi

# Summary
echo -e "${BLUE}📋 Summary${NC}"
echo "=========="
echo "Base URL: ${BASE_URL}"
echo "User Token: ${TOKEN:0:50}..."
echo "User ID from token: ${USER_ID}"
echo ""

if [[ "$USER_ID" == onecrew_user_* ]] || [[ "$USER_ID" == onecrew_company_* ]]; then
  echo -e "${GREEN}✅ Test passed! Token endpoint returns correct user ID format${NC}"
  exit 0
else
  echo -e "${RED}❌ Test failed! User ID format is incorrect${NC}"
  exit 1
fi

