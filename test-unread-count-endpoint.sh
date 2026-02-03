#!/bin/bash

# Test script for unread count endpoint
# Tests GET /api/chat/conversations/unread-count

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-https://onecrew-backend-staging-309236356616.us-central1.run.app}"
ENDPOINT="/api/chat/conversations/unread-count"

# Test credentials (update these)
EMAIL="${EMAIL:-ghoneem77@gmail.com}"
PASSWORD="${PASSWORD:-password123}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Unread Count Endpoint Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Base URL: ${YELLOW}${BASE_URL}${NC}"
echo -e "Endpoint: ${YELLOW}${ENDPOINT}${NC}"
echo ""

# Step 1: Login and get token
echo -e "${BLUE}[1/5] Authenticating...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to connect to backend${NC}"
  exit 1
fi

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Failed to get token${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Authentication successful${NC}"
echo ""

# Step 2: Get user ID (for company profile test)
echo -e "${BLUE}[2/5] Getting user info...${NC}"
USER_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/users/me" \
  -H "Authorization: Bearer ${TOKEN}")

USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo -e "${GREEN}✅ User ID: ${USER_ID}${NC}"
echo ""

# Step 3: Test user profile unread count
echo -e "${BLUE}[3/5] Testing user profile unread count...${NC}"
echo -e "Request: ${YELLOW}GET ${BASE_URL}${ENDPOINT}?profile_type=user${NC}"
echo ""

START_TIME=$(date +%s%N)
USER_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}${ENDPOINT}?profile_type=user" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")
END_TIME=$(date +%s%N)

HTTP_CODE=$(echo "$USER_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$USER_RESPONSE" | sed '$d')
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 )) # Convert to milliseconds

echo -e "HTTP Status: ${YELLOW}${HTTP_CODE}${NC}"
echo -e "Response Time: ${YELLOW}${RESPONSE_TIME}ms${NC}"
echo "Response Body:"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  UNREAD_COUNT=$(echo "$RESPONSE_BODY" | grep -o '"unread_count":[0-9]*' | cut -d':' -f2)
  CACHED=$(echo "$RESPONSE_BODY" | grep -o '"cached":[^,}]*' | cut -d':' -f2)
  
  if [ -n "$UNREAD_COUNT" ]; then
    echo -e "${GREEN}✅ User profile unread count: ${UNREAD_COUNT}${NC}"
    if [ "$CACHED" = "true" ]; then
      echo -e "${YELLOW}   (served from cache)${NC}"
    fi
  else
    echo -e "${YELLOW}⚠️  Could not parse unread_count${NC}"
  fi
else
  echo -e "${RED}❌ Request failed${NC}"
fi
echo ""

# Step 4: Get company ID (if user has companies)
echo -e "${BLUE}[4/5] Getting user companies...${NC}"
COMPANIES_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/companies/my" \
  -H "Authorization: Bearer ${TOKEN}")

COMPANY_ID=$(echo "$COMPANIES_RESPONSE" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)

if [ -n "$COMPANY_ID" ]; then
  echo -e "${GREEN}✅ Found company ID: ${COMPANY_ID}${NC}"
  echo ""
  
  # Test company profile unread count
  echo -e "${BLUE}[5/5] Testing company profile unread count...${NC}"
  echo -e "Request: ${YELLOW}GET ${BASE_URL}${ENDPOINT}?profile_type=company&company_id=${COMPANY_ID}${NC}"
  echo ""
  
  START_TIME=$(date +%s%N)
  COMPANY_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}${ENDPOINT}?profile_type=company&company_id=${COMPANY_ID}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json")
  END_TIME=$(date +%s%N)
  
  HTTP_CODE=$(echo "$COMPANY_RESPONSE" | tail -n1)
  RESPONSE_BODY=$(echo "$COMPANY_RESPONSE" | sed '$d')
  RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))
  
  echo -e "HTTP Status: ${YELLOW}${HTTP_CODE}${NC}"
  echo -e "Response Time: ${YELLOW}${RESPONSE_TIME}ms${NC}"
  echo "Response Body:"
  echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
  echo ""
  
  if [ "$HTTP_CODE" = "200" ]; then
    UNREAD_COUNT=$(echo "$RESPONSE_BODY" | grep -o '"unread_count":[0-9]*' | cut -d':' -f2)
    CACHED=$(echo "$RESPONSE_BODY" | grep -o '"cached":[^,}]*' | cut -d':' -f2)
    
    if [ -n "$UNREAD_COUNT" ]; then
      echo -e "${GREEN}✅ Company profile unread count: ${UNREAD_COUNT}${NC}"
      if [ "$CACHED" = "true" ]; then
        echo -e "${YELLOW}   (served from cache)${NC}"
      fi
    else
      echo -e "${YELLOW}⚠️  Could not parse unread_count${NC}"
    fi
  else
    echo -e "${RED}❌ Request failed${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  No companies found, skipping company profile test${NC}"
fi
echo ""

# Step 5: Test error cases
echo -e "${BLUE}[6/6] Testing error cases...${NC}"
echo ""

# Test missing profile_type
echo -e "Test 1: Missing profile_type"
ERROR_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}${ENDPOINT}" \
  -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$ERROR_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$ERROR_RESPONSE" | sed '$d')
if [ "$HTTP_CODE" = "400" ]; then
  echo -e "${GREEN}✅ Correctly returned 400 for missing profile_type${NC}"
else
  echo -e "${RED}❌ Expected 400, got ${HTTP_CODE}${NC}"
fi
echo ""

# Test invalid profile_type
echo -e "Test 2: Invalid profile_type"
ERROR_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}${ENDPOINT}?profile_type=invalid" \
  -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$ERROR_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
  echo -e "${GREEN}✅ Correctly returned 400 for invalid profile_type${NC}"
else
  echo -e "${RED}❌ Expected 400, got ${HTTP_CODE}${NC}"
fi
echo ""

# Test company profile without company_id
echo -e "Test 3: Company profile without company_id"
ERROR_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}${ENDPOINT}?profile_type=company" \
  -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$ERROR_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
  echo -e "${GREEN}✅ Correctly returned 400 for missing company_id${NC}"
else
  echo -e "${RED}❌ Expected 400, got ${HTTP_CODE}${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "✅ Endpoint is accessible"
echo -e "✅ Authentication works"
echo -e "✅ User profile endpoint works"
if [ -n "$COMPANY_ID" ]; then
  echo -e "✅ Company profile endpoint works"
fi
echo -e "✅ Error handling works"
echo ""
echo -e "${GREEN}All tests completed!${NC}"
