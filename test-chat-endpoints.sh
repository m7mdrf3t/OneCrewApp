#!/bin/bash

# Test Chat Endpoints - Identifies issues when opening chat conversations
# Run this to verify backend chat APIs respond correctly

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="${BASE_URL:-https://onecrew-backend-staging-309236356616.us-central1.run.app}"
EMAIL="${EMAIL:-ghoneem77@gmail.com}"
PASSWORD="${PASSWORD:-password123}"
TIMEOUT=10

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Chat Endpoints Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Base URL: $BASE_URL"
echo ""

# 1. Authenticate
echo -e "${BLUE}[1] Authenticating...${NC}"
LOGIN_RESPONSE=$(curl -s -m $TIMEOUT -X POST "${BASE_URL}/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Authentication failed${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Authenticated${NC}"
echo ""

# 2. Get Stream Chat token
echo -e "${BLUE}[2] Testing Stream Chat token...${NC}"
TOKEN_RESPONSE=$(curl -s -m $TIMEOUT -X POST "${BASE_URL}/api/chat/token" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

if echo "$TOKEN_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Stream Chat token OK${NC}"
else
  echo -e "${RED}❌ Stream Chat token failed${NC}"
  echo "$TOKEN_RESPONSE" | head -5
fi
echo ""

# 3. Get conversations list
echo -e "${BLUE}[3] Testing GET /api/chat/conversations...${NC}"
CONV_RESPONSE=$(curl -s -m $TIMEOUT -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}" \
  -X GET "${BASE_URL}/api/chat/conversations?profile_type=user&page=1&limit=20" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$CONV_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
RESP_TIME=$(echo "$CONV_RESPONSE" | grep "TIME:" | cut -d':' -f2)
BODY=$(echo "$CONV_RESPONSE" | sed '/HTTP_CODE:/d' | sed '/TIME:/d')

if [ "$HTTP_CODE" = "200" ]; then
  CONV_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  echo -e "${GREEN}✅ Conversations OK (HTTP $HTTP_CODE, ${RESP_TIME}s)${NC}"
  if [ -n "$CONV_ID" ]; then
    echo "   First conversation ID: $CONV_ID"
  fi
else
  echo -e "${RED}❌ Conversations failed (HTTP $HTTP_CODE, ${RESP_TIME}s)${NC}"
  echo "$BODY" | head -3
fi
echo ""

# 4. Test prepare endpoint (critical for opening chat)
if [ -n "$CONV_ID" ]; then
  echo -e "${BLUE}[4] Testing POST /api/chat/conversations/${CONV_ID}/prepare...${NC}"
  PREPARE_RESPONSE=$(curl -s -m $TIMEOUT -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}" \
    -X POST "${BASE_URL}/api/chat/conversations/${CONV_ID}/prepare" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json")

  PREP_HTTP=$(echo "$PREPARE_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
  PREP_TIME=$(echo "$PREPARE_RESPONSE" | grep "TIME:" | cut -d':' -f2)

  if [ "$PREP_HTTP" = "200" ] || [ "$PREP_HTTP" = "201" ] || [ "$PREP_HTTP" = "204" ]; then
    echo -e "${GREEN}✅ Prepare OK (HTTP $PREP_HTTP, ${PREP_TIME}s)${NC}"
  else
    echo -e "${YELLOW}⚠️ Prepare returned HTTP $PREP_HTTP (${PREP_TIME}s)${NC}"
    echo "   This may cause chat to hang if prepare is required"
    echo "$PREPARE_RESPONSE" | sed '/HTTP_CODE:/d' | sed '/TIME:/d' | head -3
  fi
  echo ""
else
  echo -e "${YELLOW}[4] Skipping prepare test (no conversation ID)${NC}"
  echo ""
fi

# 5. Test get conversation by ID
if [ -n "$CONV_ID" ]; then
  echo -e "${BLUE}[5] Testing GET /api/chat/conversations/${CONV_ID}...${NC}"
  GET_CONV=$(curl -s -m $TIMEOUT -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}" \
    -X GET "${BASE_URL}/api/chat/conversations/${CONV_ID}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json")

  GET_HTTP=$(echo "$GET_CONV" | grep "HTTP_CODE:" | cut -d':' -f2)
  GET_TIME=$(echo "$GET_CONV" | grep "TIME:" | cut -d':' -f2)

  if [ "$GET_HTTP" = "200" ]; then
    echo -e "${GREEN}✅ Get conversation OK (HTTP $GET_HTTP, ${GET_TIME}s)${NC}"
  else
    echo -e "${RED}❌ Get conversation failed (HTTP $GET_HTTP, ${GET_TIME}s)${NC}"
  fi
  echo ""
fi

# 6. Test get messages
if [ -n "$CONV_ID" ]; then
  echo -e "${BLUE}[6] Testing GET /api/chat/conversations/${CONV_ID}/messages...${NC}"
  MSG_RESPONSE=$(curl -s -m $TIMEOUT -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}" \
    -X GET "${BASE_URL}/api/chat/conversations/${CONV_ID}/messages?limit=20" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json")

  MSG_HTTP=$(echo "$MSG_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
  MSG_TIME=$(echo "$MSG_RESPONSE" | grep "TIME:" | cut -d':' -f2)

  if [ "$MSG_HTTP" = "200" ]; then
    echo -e "${GREEN}✅ Get messages OK (HTTP $MSG_HTTP, ${MSG_TIME}s)${NC}"
  else
    echo -e "${RED}❌ Get messages failed (HTTP $MSG_HTTP, ${MSG_TIME}s)${NC}"
  fi
  echo ""
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "If prepare or conversations endpoints are slow/hanging:"
echo "  - Check backend logs for timeouts"
echo "  - Verify Stream Chat API connectivity from backend"
echo "  - Check rate limiting (429 errors)"
echo ""
echo "Frontend fixes applied:"
echo "  - Use getBaseUrl() instead of localhost fallback"
echo "  - 8s timeout on prepare fetch"
echo "  - 15s timeout on channel.watch()"
echo ""
