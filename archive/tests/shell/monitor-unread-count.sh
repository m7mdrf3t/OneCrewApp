#!/bin/bash

# Monitor unread count endpoint continuously
# Useful for testing cache behavior and performance

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BASE_URL="${BASE_URL:-https://onecrew-backend-staging-309236356616.us-central1.run.app}"
ENDPOINT="/api/chat/conversations/unread-count"
EMAIL="${EMAIL:-ghoneem77@gmail.com}"
PASSWORD="${PASSWORD:-password123}"
INTERVAL="${INTERVAL:-2}" # seconds between requests

# Login once
echo -e "${BLUE}Authenticating...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to authenticate"
  exit 1
fi

echo -e "${GREEN}✅ Authenticated${NC}"
echo -e "Monitoring endpoint every ${INTERVAL} seconds..."
echo -e "Press Ctrl+C to stop"
echo ""

# Monitor loop
while true; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  
  # Test user profile
  START_TIME=$(date +%s%N)
  RESPONSE=$(curl -s -X GET "${BASE_URL}${ENDPOINT}?profile_type=user" \
    -H "Authorization: Bearer ${TOKEN}")
  END_TIME=$(date +%s%N)
  
  RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))
  UNREAD_COUNT=$(echo "$RESPONSE" | grep -o '"unread_count":[0-9]*' | cut -d':' -f2 || echo "?")
  CACHED=$(echo "$RESPONSE" | grep -o '"cached":[^,}]*' | cut -d':' -f2 || echo "false")
  
  if [ "$CACHED" = "true" ]; then
    CACHE_INDICATOR="${YELLOW}[CACHED]${NC}"
  else
    CACHE_INDICATOR="${GREEN}[FRESH]${NC}"
  fi
  
  echo -e "[${TIMESTAMP}] Unread: ${UNREAD_COUNT} | Time: ${RESPONSE_TIME}ms ${CACHE_INDICATOR}"
  
  sleep "$INTERVAL"
done
