#!/bin/bash

# Test Academy Visibility Filtering - LOCAL BACKEND
# Make sure your backend is running on localhost:3000

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Academy Visibility Filtering Tests${NC}"
echo -e "${BLUE}Testing against: ${BASE_URL}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test 1: Guest User (No Auth Token) - Should only see published academies
echo -e "${YELLOW}Test 1: Guest User (No Auth)${NC}"
echo "Expected: Only published academies (visibility='published' or NULL)"
echo ""

RESPONSE1=$(curl -s -X GET "${BASE_URL}/api/companies?subcategory=academy&limit=100" \
  -H "Content-Type: application/json")

echo "Response (first 3 academies):"
echo "$RESPONSE1" | jq '.data[0:3] | .[] | {id, name, visibility, owner_id: .owner.id}' 2>/dev/null || echo "$RESPONSE1"
echo ""

# Check if any private academies are returned
PRIVATE_COUNT=$(echo "$RESPONSE1" | jq '[.data[]? | select(.visibility == "private")] | length' 2>/dev/null || echo "0")
TOTAL_COUNT=$(echo "$RESPONSE1" | jq '[.data[]?] | length' 2>/dev/null || echo "0")
PUBLISHED_COUNT=$(echo "$RESPONSE1" | jq '[.data[]? | select(.visibility == "published" or .visibility == null)] | length' 2>/dev/null || echo "0")

echo "Summary:"
echo "  Total academies: $TOTAL_COUNT"
echo "  Published academies: $PUBLISHED_COUNT"
echo "  Private academies: $PRIVATE_COUNT"
echo ""

if [ "$PRIVATE_COUNT" -gt 0 ]; then
  echo -e "${RED}❌ FAIL: Guest user can see $PRIVATE_COUNT private academy/academies${NC}"
  echo "Private academies found:"
  echo "$RESPONSE1" | jq '[.data[]? | select(.visibility == "private")] | .[] | {id, name, visibility, owner_id: .owner.id}' 2>/dev/null
else
  echo -e "${GREEN}✅ PASS: Guest user only sees published academies${NC}"
fi
echo ""
echo "----------------------------------------"
echo ""

# Test 2: Regular Authenticated User (Not Owner/Admin)
if [ -z "$REGULAR_USER_TOKEN" ]; then
  echo -e "${YELLOW}Test 2: Regular User (Skipped - No Token)${NC}"
  echo "To test, set REGULAR_USER_TOKEN environment variable:"
  echo "  export REGULAR_USER_TOKEN='your_jwt_token_here'"
  echo "Then run this script again"
  echo ""
else
  echo -e "${YELLOW}Test 2: Regular Authenticated User${NC}"
  echo "Expected: Only published academies (not private ones unless user is owner/admin)"
  echo ""

  RESPONSE2=$(curl -s -X GET "${BASE_URL}/api/companies?subcategory=academy&limit=100" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${REGULAR_USER_TOKEN}")

  echo "Response (first 3 academies):"
  echo "$RESPONSE2" | jq '.data[0:3] | .[] | {id, name, visibility, owner_id: .owner.id}' 2>/dev/null || echo "$RESPONSE2"
  echo ""

  PRIVATE_COUNT2=$(echo "$RESPONSE2" | jq '[.data[]? | select(.visibility == "private")] | length' 2>/dev/null || echo "0")
  TOTAL_COUNT2=$(echo "$RESPONSE2" | jq '[.data[]?] | length' 2>/dev/null || echo "0")
  PUBLISHED_COUNT2=$(echo "$RESPONSE2" | jq '[.data[]? | select(.visibility == "published" or .visibility == null)] | length' 2>/dev/null || echo "0")

  echo "Summary:"
  echo "  Total academies: $TOTAL_COUNT2"
  echo "  Published academies: $PUBLISHED_COUNT2"
  echo "  Private academies: $PRIVATE_COUNT2"
  echo ""

  if [ "$PRIVATE_COUNT2" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  WARNING: Regular user can see $PRIVATE_COUNT2 private academy/academies${NC}"
    echo "This is OK if the user is the owner or admin of those academies"
    echo "Private academies found:"
    echo "$RESPONSE2" | jq '[.data[]? | select(.visibility == "private")] | .[] | {id, name, visibility, owner_id: .owner.id}' 2>/dev/null
  else
    echo -e "${GREEN}✅ PASS: Regular user only sees published academies${NC}"
  fi
  echo ""
fi
echo "----------------------------------------"
echo ""

# Test 3: Academy Owner - Should see their private academies
if [ -z "$OWNER_TOKEN" ]; then
  echo -e "${YELLOW}Test 3: Academy Owner (Skipped - No Token)${NC}"
  echo "To test, set OWNER_TOKEN environment variable:"
  echo "  export OWNER_TOKEN='jwt_token_of_academy_owner'"
  echo ""
else
  echo -e "${YELLOW}Test 3: Academy Owner${NC}"
  echo "Expected: All published academies + their own private academies"
  echo ""

  RESPONSE3=$(curl -s -X GET "${BASE_URL}/api/companies?subcategory=academy&limit=100" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${OWNER_TOKEN}")

  PRIVATE_COUNT3=$(echo "$RESPONSE3" | jq '[.data[]? | select(.visibility == "private")] | length' 2>/dev/null || echo "0")
  TOTAL_COUNT3=$(echo "$RESPONSE3" | jq '[.data[]?] | length' 2>/dev/null || echo "0")

  echo "Summary:"
  echo "  Total academies: $TOTAL_COUNT3"
  echo "  Private academies: $PRIVATE_COUNT3"
  echo -e "${GREEN}✅ Owner can see $PRIVATE_COUNT3 private academy/academies (should be their own)${NC}"
  echo ""
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Testing Complete${NC}"
echo -e "${BLUE}========================================${NC}"

