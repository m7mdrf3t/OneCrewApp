#!/bin/bash

# Continuous test script - keeps testing until endpoint works
# Press Ctrl+C to stop

BASE_URL="https://onecrew-backend-staging-309236356616.us-central1.run.app"
EMAIL="ghoneem77@gmail.com"
PASSWORD="password123"
INTERVAL=5  # seconds between tests

echo "🔄 Continuous testing mode - Press Ctrl+C to stop"
echo "Testing every $INTERVAL seconds..."
echo ""

# Get token once
echo "Authenticating..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to authenticate. Retrying..."
  # Keep trying to authenticate
  while [ -z "$TOKEN" ]; do
    sleep 2
    LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/signin" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    if [ -z "$TOKEN" ]; then
      echo "⏳ Retrying authentication..."
    fi
  done
fi

echo "✅ Authenticated"
echo ""

# Continuous testing loop
TEST_NUMBER=0
while true; do
  TEST_NUMBER=$((TEST_NUMBER + 1))
  TIMESTAMP=$(date '+%H:%M:%S')
  
  echo "[$TIMESTAMP] Test #$TEST_NUMBER"
  
  START_TIME=$(date +%s%N)
  RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "${BASE_URL}/api/chat/conversations/unread-count?profile_type=user" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json")
  END_TIME=$(date +%s%N)
  
  HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')
  RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))
  
  if [ "$HTTP_CODE" = "200" ]; then
    UNREAD_COUNT=$(echo "$BODY" | grep -o '"unread_count":[0-9]*' | cut -d':' -f2 || echo "?")
    CACHED=$(echo "$BODY" | grep -o '"cached":[^,}]*' | cut -d':' -f2 || echo "false")
    
    if [ "$CACHED" = "true" ]; then
      CACHE_IND="[CACHED]"
    else
      CACHE_IND="[FRESH]"
    fi
    
    echo "  ✅ HTTP $HTTP_CODE | Unread: $UNREAD_COUNT | Time: ${RESPONSE_TIME}ms $CACHE_IND"
  else
    echo "  ❌ HTTP $HTTP_CODE | Time: ${RESPONSE_TIME}ms"
    echo "  Response: $BODY"
  fi
  
  sleep "$INTERVAL"
done
