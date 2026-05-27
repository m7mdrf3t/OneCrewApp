#!/bin/bash

# Backend Test with Retry Logic
# Keeps testing until backend is available

BASE_URL="${BASE_URL:-https://onecrew-backend-staging-309236356616.us-central1.run.app}"
EMAIL="${EMAIL:-ghoneem77@gmail.com}"
PASSWORD="${PASSWORD:-password123}"
MAX_RETRIES="${MAX_RETRIES:-10}"
RETRY_DELAY="${RETRY_DELAY:-5}"

echo "🔄 Backend Test with Retry"
echo "=========================="
echo "Base URL: $BASE_URL"
echo "Max Retries: $MAX_RETRIES"
echo "Retry Delay: ${RETRY_DELAY}s"
echo ""

RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  TIMESTAMP=$(date '+%H:%M:%S')
  
  echo "[$TIMESTAMP] Attempt $RETRY_COUNT/$MAX_RETRIES"
  
  # Test 1: Authentication
  echo "  → Authenticating..."
  LOGIN_RESPONSE=$(curl -s -m 10 -X POST "${BASE_URL}/api/auth/signin" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")
  
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  
  if [ -z "$TOKEN" ]; then
    echo "  ❌ Authentication failed"
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
      echo "  ⏳ Retrying in ${RETRY_DELAY}s..."
      sleep $RETRY_DELAY
      continue
    else
      echo ""
      echo "❌ All retries exhausted. Backend may be down."
      echo "Check if backend is running at: $BASE_URL"
      exit 1
    fi
  fi
  
  echo "  ✅ Authenticated"
  
  # Test 2: Unread Count Endpoint
  echo "  → Testing unread count endpoint..."
  RESPONSE=$(curl -s -m 10 -w "\nHTTP_CODE:%{http_code}" -X GET "${BASE_URL}/api/chat/conversations/unread-count?profile_type=user" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json")
  
  HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')
  
  if [ "$HTTP_CODE" = "200" ]; then
    UNREAD_COUNT=$(echo "$BODY" | grep -o '"unread_count":[0-9]*' | cut -d':' -f2)
    SUCCESS=$(echo "$BODY" | grep -o '"success":true' || echo "")
    
    if [ -n "$SUCCESS" ] && [ -n "$UNREAD_COUNT" ]; then
      echo ""
      echo "✅ SUCCESS! Backend endpoint is working!"
      echo "========================================"
      echo "HTTP Status: $HTTP_CODE"
      echo "Unread Count: $UNREAD_COUNT"
      echo ""
      echo "Response:"
      echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
      echo ""
      echo "✅ Backend confirmed working!"
      exit 0
    else
      echo "  ⚠️  Got 200 but response structure may be invalid"
      echo "  Response: $BODY"
    fi
  else
    echo "  ❌ Endpoint returned HTTP $HTTP_CODE"
    if [ "$HTTP_CODE" = "000" ] || [ -z "$HTTP_CODE" ]; then
      echo "  ⚠️  Connection failed - backend may be down"
      if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        echo "  ⏳ Retrying in ${RETRY_DELAY}s..."
        sleep $RETRY_DELAY
        continue
      fi
    else
      echo "  Response: $BODY"
      echo ""
      echo "⚠️  Endpoint exists but returned error"
      exit 1
    fi
  fi
  
  sleep $RETRY_DELAY
done

echo ""
echo "❌ All retries exhausted"
exit 1
