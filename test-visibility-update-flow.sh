#!/bin/bash

# Test Academy Visibility Update Flow
# This script tests that:
# 1. Setting an academy to private saves correctly
# 2. Private academies are removed from directory for non-admin users
# 3. Only admins/owners can see private academies

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Academy Visibility Update Flow Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ -z "$ACADEMY_ID" ] || [ -z "$OWNER_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  Required environment variables:${NC}"
  echo "  ACADEMY_ID - The ID of the academy to test"
  echo "  OWNER_TOKEN - JWT token of the academy owner"
  echo ""
  echo "Example:"
  echo "  ACADEMY_ID='abc123' OWNER_TOKEN='your_token' ./test-visibility-update-flow.sh"
  exit 1
fi

echo -e "${YELLOW}Step 1: Get current academy visibility${NC}"
CURRENT_ACADEMY=$(curl -s -X GET "${BASE_URL}/api/companies/${ACADEMY_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${OWNER_TOKEN}")

CURRENT_VISIBILITY=$(echo "$CURRENT_ACADEMY" | jq -r '.data.visibility // "published"')
echo "Current visibility: $CURRENT_VISIBILITY"
echo ""

echo -e "${YELLOW}Step 2: Check if academy appears in directory (as guest)${NC}"
GUEST_LIST=$(curl -s -X GET "${BASE_URL}/api/companies?subcategory=academy&limit=100" \
  -H "Content-Type: application/json")

ACADEMY_IN_GUEST_LIST=$(echo "$GUEST_LIST" | jq --arg id "$ACADEMY_ID" '[.data[]? | select(.id == $id)] | length')
echo "Academy in guest list: $ACADEMY_IN_GUEST_LIST (1 = visible, 0 = hidden)"
echo ""

echo -e "${YELLOW}Step 3: Set academy to private${NC}"
UPDATE_RESPONSE=$(curl -s -X PATCH "${BASE_URL}/api/companies/${ACADEMY_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${OWNER_TOKEN}" \
  -d "{\"visibility\": \"private\"}")

UPDATE_SUCCESS=$(echo "$UPDATE_RESPONSE" | jq -r '.success')
if [ "$UPDATE_SUCCESS" = "true" ]; then
  echo -e "${GREEN}✅ Academy set to private successfully${NC}"
else
  echo -e "${RED}❌ Failed to set academy to private${NC}"
  echo "$UPDATE_RESPONSE" | jq '.'
  exit 1
fi
echo ""

# Wait a moment for cache to clear
sleep 2

echo -e "${YELLOW}Step 4: Verify academy is hidden from guest users${NC}"
GUEST_LIST_AFTER=$(curl -s -X GET "${BASE_URL}/api/companies?subcategory=academy&limit=100" \
  -H "Content-Type: application/json")

ACADEMY_IN_GUEST_LIST_AFTER=$(echo "$GUEST_LIST_AFTER" | jq --arg id "$ACADEMY_ID" '[.data[]? | select(.id == $id)] | length')
if [ "$ACADEMY_IN_GUEST_LIST_AFTER" -eq 0 ]; then
  echo -e "${GREEN}✅ Academy is hidden from guest users (correct)${NC}"
else
  echo -e "${RED}❌ Academy is still visible to guest users (incorrect)${NC}"
fi
echo ""

echo -e "${YELLOW}Step 5: Verify academy is visible to owner${NC}"
OWNER_LIST=$(curl -s -X GET "${BASE_URL}/api/companies?subcategory=academy&limit=100" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${OWNER_TOKEN}")

ACADEMY_IN_OWNER_LIST=$(echo "$OWNER_LIST" | jq --arg id "$ACADEMY_ID" '[.data[]? | select(.id == $id)] | length')
if [ "$ACADEMY_IN_OWNER_LIST" -eq 1 ]; then
  echo -e "${GREEN}✅ Academy is visible to owner (correct)${NC}"
else
  echo -e "${RED}❌ Academy is not visible to owner (incorrect)${NC}"
fi
echo ""

echo -e "${YELLOW}Step 6: Verify visibility was saved${NC}"
UPDATED_ACADEMY=$(curl -s -X GET "${BASE_URL}/api/companies/${ACADEMY_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${OWNER_TOKEN}")

SAVED_VISIBILITY=$(echo "$UPDATED_ACADEMY" | jq -r '.data.visibility // "published"')
if [ "$SAVED_VISIBILITY" = "private" ]; then
  echo -e "${GREEN}✅ Visibility saved correctly: $SAVED_VISIBILITY${NC}"
else
  echo -e "${RED}❌ Visibility not saved correctly. Expected: private, Got: $SAVED_VISIBILITY${NC}"
fi
echo ""

echo -e "${YELLOW}Step 7: Restore original visibility${NC}"
if [ "$CURRENT_VISIBILITY" != "private" ]; then
  RESTORE_RESPONSE=$(curl -s -X PATCH "${BASE_URL}/api/companies/${ACADEMY_ID}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" \
    -d "{\"visibility\": \"$CURRENT_VISIBILITY\"}")
  
  RESTORE_SUCCESS=$(echo "$RESTORE_RESPONSE" | jq -r '.success')
  if [ "$RESTORE_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ Original visibility restored: $CURRENT_VISIBILITY${NC}"
  else
    echo -e "${YELLOW}⚠️  Failed to restore original visibility${NC}"
  fi
else
  echo "Academy was already private, skipping restore"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Complete${NC}"
echo -e "${BLUE}========================================${NC}"

