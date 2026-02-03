#!/bin/bash

# Backend Unread Count Endpoint Test
# Tests and confirms the backend endpoint is working correctly

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-https://onecrew-backend-staging-309236356616.us-central1.run.app}"
ENDPOINT="/api/chat/conversations/unread-count"
EMAIL="${EMAIL:-ghoneem77@gmail.com}"
PASSWORD="${PASSWORD:-password123}"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_header() {
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
}

print_test() {
  echo -e "${CYAN}[TEST]${NC} $1"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Test 1: Authentication
print_header "Test 1: Authentication"
print_test "Logging in with credentials..."

LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

if [ $? -ne 0 ]; then
  print_error "Failed to connect to backend"
  echo "Check if backend is running at: ${BASE_URL}"
  exit 1
fi

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  print_error "Failed to get authentication token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

print_success "Authentication successful"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Test 2: Get User Info
print_header "Test 2: Get User Information"
print_test "Fetching user information..."

USER_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/users/me" \
  -H "Authorization: Bearer ${TOKEN}")

USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  print_error "Failed to get user ID"
  echo "Response: $USER_RESPONSE"
  exit 1
fi

print_success "User ID retrieved: ${USER_ID}"
echo ""

# Test 3: User Profile Unread Count
print_header "Test 3: User Profile Unread Count"
print_test "Testing GET ${ENDPOINT}?profile_type=user"

START_TIME=$(date +%s%N)
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}" -X GET "${BASE_URL}${ENDPOINT}?profile_type=user" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")
END_TIME=$(date +%s%N)

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
RESPONSE_TIME=$(echo "$RESPONSE" | grep "TIME:" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d' | sed '/TIME:/d')

echo "HTTP Status: ${HTTP_CODE}"
echo "Response Time: ${RESPONSE_TIME}s"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  # Validate response structure
  HAS_SUCCESS=$(echo "$BODY" | grep -o '"success":true' || echo "")
  HAS_DATA=$(echo "$BODY" | grep -o '"data":{' || echo "")
  UNREAD_COUNT=$(echo "$BODY" | grep -o '"unread_count":[0-9]*' | cut -d':' -f2 || echo "")
  PROFILE_TYPE=$(echo "$BODY" | grep -o '"profile_type":"[^"]*' | cut -d'"' -f4 || echo "")
  CACHED=$(echo "$BODY" | grep -o '"cached":[^,}]*' | cut -d':' -f2 || echo "false")
  
  if [ -n "$HAS_SUCCESS" ] && [ -n "$HAS_DATA" ]; then
    print_success "Response structure is valid"
    echo "  - success: true"
    echo "  - unread_count: ${UNREAD_COUNT}"
    echo "  - profile_type: ${PROFILE_TYPE}"
    echo "  - cached: ${CACHED}"
    
    if [ "$PROFILE_TYPE" = "user" ]; then
      print_success "Profile type is correct (user)"
    else
      print_error "Profile type mismatch. Expected 'user', got '${PROFILE_TYPE}'"
    fi
    
    if [ -n "$UNREAD_COUNT" ]; then
      print_success "Unread count retrieved: ${UNREAD_COUNT}"
    else
      print_error "Unread count not found in response"
    fi
  else
    print_error "Invalid response structure"
  fi
else
  print_error "Request failed with HTTP ${HTTP_CODE}"
fi

echo ""

# Test 4: Cache Test (Second Request)
print_header "Test 4: Cache Behavior"
print_test "Making second request to test cache..."

sleep 1

START_TIME=$(date +%s%N)
RESPONSE2=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}" -X GET "${BASE_URL}${ENDPOINT}?profile_type=user" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")
END_TIME=$(date +%s%N)

HTTP_CODE2=$(echo "$RESPONSE2" | grep "HTTP_CODE:" | cut -d':' -f2)
RESPONSE_TIME2=$(echo "$RESPONSE2" | grep "TIME:" | cut -d':' -f2)
BODY2=$(echo "$RESPONSE2" | sed '/HTTP_CODE:/d' | sed '/TIME:/d')

CACHED2=$(echo "$BODY2" | grep -o '"cached":[^,}]*' | cut -d':' -f2 || echo "false")

echo "HTTP Status: ${HTTP_CODE2}"
echo "Response Time: ${RESPONSE_TIME2}s"
echo "Cached: ${CACHED2}"
echo ""

if [ "$CACHED2" = "true" ]; then
  print_success "Cache is working (second request served from cache)"
  
  # Compare response times
  TIME1=$(echo "$RESPONSE_TIME" | awk '{print $1}')
  TIME2=$(echo "$RESPONSE_TIME2" | awk '{print $1}')
  
  if (( $(echo "$TIME2 < $TIME1" | bc -l 2>/dev/null || echo "0") )); then
    print_success "Cached response is faster (${TIME2}s < ${TIME1}s)"
  else
    print_warning "Cached response time: ${TIME2}s (may vary)"
  fi
else
  print_warning "Cache not detected (may be first request or cache expired)"
fi

echo ""

# Test 5: Get Companies
print_header "Test 5: Company Profile Test"
print_test "Fetching user companies..."

COMPANIES_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/companies/my" \
  -H "Authorization: Bearer ${TOKEN}")

COMPANY_ID=$(echo "$COMPANIES_RESPONSE" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)

if [ -n "$COMPANY_ID" ]; then
  print_success "Found company ID: ${COMPANY_ID}"
  echo ""
  
  # Test company profile unread count
  print_test "Testing GET ${ENDPOINT}?profile_type=company&company_id=${COMPANY_ID}"
  
  START_TIME=$(date +%s%N)
  COMPANY_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}" -X GET "${BASE_URL}${ENDPOINT}?profile_type=company&company_id=${COMPANY_ID}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json")
  END_TIME=$(date +%s%N)
  
  HTTP_CODE_COMPANY=$(echo "$COMPANY_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
  RESPONSE_TIME_COMPANY=$(echo "$COMPANY_RESPONSE" | grep "TIME:" | cut -d':' -f2)
  BODY_COMPANY=$(echo "$COMPANY_RESPONSE" | sed '/HTTP_CODE:/d' | sed '/TIME:/d')
  
  echo "HTTP Status: ${HTTP_CODE_COMPANY}"
  echo "Response Time: ${RESPONSE_TIME_COMPANY}s"
  echo "Response Body:"
  echo "$BODY_COMPANY" | jq '.' 2>/dev/null || echo "$BODY_COMPANY"
  echo ""
  
  if [ "$HTTP_CODE_COMPANY" = "200" ]; then
    COMPANY_UNREAD_COUNT=$(echo "$BODY_COMPANY" | grep -o '"unread_count":[0-9]*' | cut -d':' -f2 || echo "")
    COMPANY_PROFILE_TYPE=$(echo "$BODY_COMPANY" | grep -o '"profile_type":"[^"]*' | cut -d'"' -f4 || echo "")
    
    if [ "$COMPANY_PROFILE_TYPE" = "company" ]; then
      print_success "Company profile endpoint works"
      echo "  - unread_count: ${COMPANY_UNREAD_COUNT}"
    else
      print_error "Profile type mismatch. Expected 'company', got '${COMPANY_PROFILE_TYPE}'"
    fi
  else
    print_error "Company profile request failed with HTTP ${HTTP_CODE_COMPANY}"
  fi
else
  print_warning "No companies found, skipping company profile test"
fi

echo ""

# Test 6: Error Cases
print_header "Test 6: Error Handling"

# Test 6.1: Missing profile_type
print_test "Testing missing profile_type parameter..."
ERROR_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "${BASE_URL}${ENDPOINT}" \
  -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE_ERROR=$(echo "$ERROR_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
BODY_ERROR=$(echo "$ERROR_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE_ERROR" = "400" ]; then
  print_success "Correctly returns 400 for missing profile_type"
else
  print_error "Expected 400, got ${HTTP_CODE_ERROR}"
fi
echo ""

# Test 6.2: Invalid profile_type
print_test "Testing invalid profile_type parameter..."
ERROR_RESPONSE2=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "${BASE_URL}${ENDPOINT}?profile_type=invalid" \
  -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE_ERROR2=$(echo "$ERROR_RESPONSE2" | grep "HTTP_CODE:" | cut -d':' -f2)

if [ "$HTTP_CODE_ERROR2" = "400" ]; then
  print_success "Correctly returns 400 for invalid profile_type"
else
  print_error "Expected 400, got ${HTTP_CODE_ERROR2}"
fi
echo ""

# Test 6.3: Company profile without company_id
print_test "Testing company profile without company_id..."
ERROR_RESPONSE3=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "${BASE_URL}${ENDPOINT}?profile_type=company" \
  -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE_ERROR3=$(echo "$ERROR_RESPONSE3" | grep "HTTP_CODE:" | cut -d':' -f2)

if [ "$HTTP_CODE_ERROR3" = "400" ]; then
  print_success "Correctly returns 400 for missing company_id"
else
  print_error "Expected 400, got ${HTTP_CODE_ERROR3}"
fi
echo ""

# Test 6.4: Invalid token
print_test "Testing with invalid token..."
ERROR_RESPONSE4=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "${BASE_URL}${ENDPOINT}?profile_type=user" \
  -H "Authorization: Bearer invalid_token")
HTTP_CODE_ERROR4=$(echo "$ERROR_RESPONSE4" | grep "HTTP_CODE:" | cut -d':' -f2)

if [ "$HTTP_CODE_ERROR4" = "401" ] || [ "$HTTP_CODE_ERROR4" = "403" ]; then
  print_success "Correctly returns ${HTTP_CODE_ERROR4} for invalid token"
else
  print_error "Expected 401/403, got ${HTTP_CODE_ERROR4}"
fi
echo ""

# Summary
print_header "Test Summary"
echo -e "${GREEN}Tests Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}Tests Failed: ${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed! Backend endpoint is working correctly.${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed. Please review the output above.${NC}"
  exit 1
fi
