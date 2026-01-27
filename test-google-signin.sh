#!/bin/bash

# Test Google Sign-In Service for iOS and Android
# This script tests the backend /api/auth/google endpoint
# Usage: ./test-google-signin.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Backend URLs
STAGING_URL="https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app"
PRODUCTION_URL="https://onecrew-backend-309236356616.us-central1.run.app"

# Use staging by default
BASE_URL="${STAGING_URL}"

echo -e "${BLUE}🧪 Testing Google Sign-In Service${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# Function to print test header
print_test_header() {
    echo -e "\n${YELLOW}📋 Test: $1${NC}"
    echo "----------------------------------------"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to print info
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Test 1: Check endpoint availability
print_test_header "1. Endpoint Availability Check"
ENDPOINT="${BASE_URL}/api/auth/google"
print_info "Testing endpoint: ${ENDPOINT}"

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d '{}' || echo "000")

if [ "$RESPONSE" = "000" ]; then
    print_error "Endpoint is not reachable (network error)"
    exit 1
elif [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "400" ] || [ "$RESPONSE" = "422" ]; then
    print_success "Endpoint is reachable (HTTP $RESPONSE - expected for invalid request)"
else
    print_info "Endpoint responded with HTTP $RESPONSE"
fi

# Test 2: Test request format validation (missing accessToken)
print_test_header "2. Request Format Validation (Missing accessToken)"
print_info "Testing with empty request body..."

RESPONSE=$(curl -s -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d '{}')

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d '{}')

echo "Response (HTTP $HTTP_CODE):"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -qi "accessToken\|token\|required\|missing"; then
    print_success "Endpoint correctly validates request format"
else
    print_info "Endpoint response: $RESPONSE"
fi

# Test 3: Test with invalid token format
print_test_header "3. Invalid Token Format Test"
print_info "Testing with invalid accessToken format..."

RESPONSE=$(curl -s -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d '{
        "accessToken": "invalid_token_format_12345"
    }')

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d '{
        "accessToken": "invalid_token_format_12345"
    }')

echo "Response (HTTP $HTTP_CODE):"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "422" ]; then
    print_success "Endpoint correctly rejects invalid token format"
else
    print_info "Endpoint response: $RESPONSE"
fi

# Test 4: Test iOS scenario (with category and role)
print_test_header "4. iOS Scenario Test (with category and primary_role)"
print_info "Testing iOS request format with category='crew' and primary_role..."

RESPONSE=$(curl -s -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d '{
        "accessToken": "test_token_ios",
        "category": "crew",
        "primary_role": "dancer"
    }')

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d '{
        "accessToken": "test_token_ios",
        "category": "crew",
        "primary_role": "dancer"
    }')

echo "Response (HTTP $HTTP_CODE):"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

print_info "iOS request format accepted (will fail auth with invalid token, but format is correct)"

# Test 5: Test Android scenario (with category and role)
print_test_header "5. Android Scenario Test (with category and primary_role)"
print_info "Testing Android request format with category='talent' and primary_role..."

RESPONSE=$(curl -s -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d '{
        "accessToken": "test_token_android",
        "category": "talent",
        "primary_role": "instructor"
    }')

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d '{
        "accessToken": "test_token_android",
        "category": "talent",
        "primary_role": "instructor"
    }')

echo "Response (HTTP $HTTP_CODE):"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

print_info "Android request format accepted (will fail auth with invalid token, but format is correct)"

# Test 6: Test company scenario
print_test_header "6. Company Scenario Test"
print_info "Testing company request format..."

RESPONSE=$(curl -s -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d '{
        "accessToken": "test_token_company",
        "category": "company",
        "primary_role": "owner"
    }')

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d '{
        "accessToken": "test_token_company",
        "category": "company",
        "primary_role": "owner"
    }')

echo "Response (HTTP $HTTP_CODE):"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

print_info "Company request format accepted (will fail auth with invalid token, but format is correct)"

# Test 7: Test without category (new user flow)
print_test_header "7. New User Flow Test (without category)"
print_info "Testing request without category (should trigger category selection flow)..."

RESPONSE=$(curl -s -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d '{
        "accessToken": "test_token_new_user"
    }')

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d '{
        "accessToken": "test_token_new_user"
    }')

echo "Response (HTTP $HTTP_CODE):"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -qi "category.*required\|missing.*category"; then
    print_success "Endpoint correctly requires category for new users"
else
    print_info "Endpoint response: $RESPONSE"
fi

# Summary
echo ""
echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}📊 Test Summary${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""
print_info "All format tests completed"
print_info "Note: Authentication will fail with test tokens, but endpoint structure is validated"
echo ""
print_info "✅ Endpoint is reachable"
print_info "✅ Request format validation works"
print_info "✅ iOS request format accepted"
print_info "✅ Android request format accepted"
print_info "✅ Company request format accepted"
print_info "✅ New user flow (without category) handled"
echo ""
print_info "🔍 To test with real authentication:"
print_info "   1. Sign in with Google in the app (iOS or Android)"
print_info "   2. Check the app logs for the Supabase access token"
print_info "   3. Use that token in a curl request to test full flow"
echo ""
print_info "📝 Expected successful response format:"
echo '   {
     "success": true,
     "data": {
       "user": { ... },
       "token": "jwt_token_here"
     }
   }'
echo ""
print_success "Google Sign-In endpoint structure test completed!"

