#!/bin/bash

# Direct test of token endpoint with known token
# Using token from logs

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjg1MWFlZS05Zjk0LTQ2NzMtOTRjNS1mMWY0MzZmOTc5YzMiLCJlbWFpbCI6Im03bWRyZjN0MEBnbWFpbC5jb20iLCJjYXRlZ29yeSI6InRhbGVudCIsInJvbGUiOiJhY3RvciIsImlhdCI6MTc2OTM2MDA4MSwiZXhwIjoxNzY5OTY0ODgxfQ.WBBaivGapz2TQkgnyeUIjrduRMELV-bJon9LivASKfc"
BASE_URL="https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app"
COMPANY_ID="fe045b7c-b310-4295-87e1-d5ceca66e55d"

echo "🧪 Testing StreamChat Token Endpoint"
echo "===================================="
echo ""

echo "📡 Test 1: User Profile Token (default)"
echo "----------------------------------------"
echo "Calling: POST ${BASE_URL}/api/chat/token"
echo ""

RESPONSE1=$(curl -s -X POST "${BASE_URL}/api/chat/token" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$RESPONSE1" | jq . 2>/dev/null || echo "$RESPONSE1"
echo ""

USER_ID=$(echo "$RESPONSE1" | jq -r '.data.user_id' 2>/dev/null)
echo "User ID: ${USER_ID}"
echo ""

if [[ "$USER_ID" == onecrew_user_* ]]; then
  echo "✅ User token format correct"
else
  echo "❌ User token format incorrect"
fi
echo ""

echo "📡 Test 2a: Company Profile Token (Query Params)"
echo "-------------------------------------------------"
echo "Calling: POST ${BASE_URL}/api/chat/token?profile_type=company&company_id=${COMPANY_ID}"
echo ""

RESPONSE2=$(curl -s -X POST "${BASE_URL}/api/chat/token?profile_type=company&company_id=${COMPANY_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$RESPONSE2" | jq . 2>/dev/null || echo "$RESPONSE2"
echo ""

COMPANY_USER_ID=$(echo "$RESPONSE2" | jq -r '.data.user_id' 2>/dev/null)
echo "Company User ID (query): ${COMPANY_USER_ID}"
echo ""

echo "📡 Test 2b: Company Profile Token (Request Body)"
echo "-------------------------------------------------"
echo "Calling: POST ${BASE_URL}/api/chat/token with body"
echo ""

RESPONSE2B=$(curl -s -X POST "${BASE_URL}/api/chat/token" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"profile_type\":\"company\",\"company_id\":\"${COMPANY_ID}\"}")

echo "Response:"
echo "$RESPONSE2B" | jq . 2>/dev/null || echo "$RESPONSE2B"
echo ""

COMPANY_USER_ID_B=$(echo "$RESPONSE2B" | jq -r '.data.user_id' 2>/dev/null)
echo "Company User ID (body): ${COMPANY_USER_ID_B}"
echo ""

# Use the body response if it worked
if [[ "$COMPANY_USER_ID_B" == onecrew_company_* ]]; then
  COMPANY_USER_ID="$COMPANY_USER_ID_B"
fi

echo "Response:"
echo "$RESPONSE2" | jq . 2>/dev/null || echo "$RESPONSE2"
echo ""

COMPANY_USER_ID=$(echo "$RESPONSE2" | jq -r '.data.user_id' 2>/dev/null)
echo "Company User ID: ${COMPANY_USER_ID}"
echo ""

if [[ "$COMPANY_USER_ID" == onecrew_company_* ]]; then
  echo "✅ Company token format correct"
  if [[ "$COMPANY_USER_ID" == *"${COMPANY_ID}"* ]]; then
    echo "✅ Company ID matches"
  else
    echo "⚠️  Company ID doesn't match expected: ${COMPANY_ID}"
  fi
else
  echo "❌ Company token format incorrect"
  echo "Expected: onecrew_company_${COMPANY_ID}"
  echo "Got: ${COMPANY_USER_ID}"
fi
echo ""

echo "📋 Summary"
echo "---------"
echo "User Token: ${USER_ID}"
echo "Company Token: ${COMPANY_USER_ID}"
echo ""

if [[ "$USER_ID" == onecrew_user_* ]] && [[ "$COMPANY_USER_ID" == onecrew_company_* ]]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Tests failed!"
  exit 1
fi

