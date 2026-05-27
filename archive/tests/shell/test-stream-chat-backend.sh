#!/bin/bash

# Stream Chat Backend Verification Script
# This script tests the backend Stream Chat token endpoint

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
EMAIL="${TEST_EMAIL:-}"
PASSWORD="${TEST_PASSWORD:-}"
JWT_TOKEN="${JWT_TOKEN:-}"

echo -e "${BLUE}🧪 Stream Chat Backend Verification Script${NC}"
echo "=========================================="
echo ""

# Function to print section headers
print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to check if jq is installed
check_jq() {
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}⚠️  jq is not installed. Installing JSON parsing...${NC}"
        echo "Install jq: brew install jq (macOS) or apt-get install jq (Linux)"
        return 1
    fi
    return 0
}

# Step 1: Login to get JWT token
print_section "Step 1: Authentication"

if [ -z "$JWT_TOKEN" ]; then
    if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
        echo -e "${YELLOW}⚠️  No JWT token provided.${NC}"
        echo "Please provide either:"
        echo "  1. JWT_TOKEN environment variable, or"
        echo "  2. TEST_EMAIL and TEST_PASSWORD for auto-login"
        echo ""
        read -p "Enter email: " EMAIL
        read -sp "Enter password: " PASSWORD
        echo ""
    fi
    
    echo "📤 Logging in..."
    LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/signin" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")
    
    if check_jq; then
        SUCCESS=$(echo "$LOGIN_RESPONSE" | jq -r '.success // false')
        if [ "$SUCCESS" = "true" ]; then
            JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // .token // empty')
            if [ -z "$JWT_TOKEN" ]; then
                echo -e "${RED}❌ Login successful but no token found in response${NC}"
                echo "Response: $LOGIN_RESPONSE"
                exit 1
            fi
            echo -e "${GREEN}✅ Login successful${NC}"
            echo "Token: ${JWT_TOKEN:0:50}..."
        else
            ERROR=$(echo "$LOGIN_RESPONSE" | jq -r '.error // .message // "Unknown error"')
            echo -e "${RED}❌ Login failed: $ERROR${NC}"
            exit 1
        fi
    else
        # Fallback without jq
        if echo "$LOGIN_RESPONSE" | grep -q "token"; then
            echo -e "${GREEN}✅ Login appears successful${NC}"
            JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
        else
            echo -e "${RED}❌ Login failed${NC}"
            echo "Response: $LOGIN_RESPONSE"
            exit 1
        fi
    fi
else
    echo -e "${GREEN}✅ Using provided JWT token${NC}"
fi

# Step 2: Test Stream Chat Token Endpoint
print_section "Step 2: Stream Chat Token Endpoint"

echo "📤 Requesting Stream Chat token..."
echo "Endpoint: POST ${BASE_URL}/api/chat/token"
echo ""

TOKEN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/chat/token" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${JWT_TOKEN}")

echo "📥 Raw Response:"
echo "$TOKEN_RESPONSE"
echo ""

if check_jq; then
    SUCCESS=$(echo "$TOKEN_RESPONSE" | jq -r '.success // false')
    
    if [ "$SUCCESS" = "true" ]; then
        echo -e "${GREEN}✅ Token endpoint working correctly!${NC}"
        echo ""
        
        # Extract data
        TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.data.token // empty')
        USER_ID=$(echo "$TOKEN_RESPONSE" | jq -r '.data.user_id // empty')
        API_KEY=$(echo "$TOKEN_RESPONSE" | jq -r '.data.api_key // empty')
        
        echo "📋 Response Details:"
        echo "  Token: ${TOKEN:0:50}... (length: ${#TOKEN})"
        echo "  User ID: $USER_ID"
        echo "  API Key: $API_KEY"
        echo ""
        
        # Validation
        VALIDATION_PASSED=true
        
        if [ -z "$TOKEN" ]; then
            echo -e "${RED}❌ Token is missing${NC}"
            VALIDATION_PASSED=false
        else
            echo -e "${GREEN}✅ Token present${NC}"
        fi
        
        if [ -z "$USER_ID" ]; then
            echo -e "${RED}❌ User ID is missing${NC}"
            VALIDATION_PASSED=false
        else
            echo -e "${GREEN}✅ User ID present: $USER_ID${NC}"
            
            # Check user ID format
            if [[ "$USER_ID" =~ ^onecrew_(user|company)_ ]]; then
                echo -e "${GREEN}✅ User ID format is correct${NC}"
            else
                echo -e "${YELLOW}⚠️  User ID format may be incorrect (expected: onecrew_user_* or onecrew_company_*)${NC}"
            fi
        fi
        
        if [ -z "$API_KEY" ]; then
            echo -e "${YELLOW}⚠️  API Key is missing (optional but recommended)${NC}"
        else
            echo -e "${GREEN}✅ API Key present: $API_KEY${NC}"
        fi
        
        echo ""
        if [ "$VALIDATION_PASSED" = true ]; then
            echo -e "${GREEN}✅ All required fields present!${NC}"
        else
            echo -e "${RED}❌ Some required fields are missing${NC}"
            exit 1
        fi
        
    else
        ERROR=$(echo "$TOKEN_RESPONSE" | jq -r '.error // .message // "Unknown error"')
        STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/api/chat/token" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${JWT_TOKEN}")
        
        echo -e "${RED}❌ Token endpoint failed!${NC}"
        echo "  Error: $ERROR"
        echo "  HTTP Status: $STATUS_CODE"
        echo ""
        echo "Common issues:"
        echo "  - Endpoint not implemented: POST /api/chat/token"
        echo "  - Authentication failed (invalid JWT)"
        echo "  - Stream Chat SDK not configured"
        echo "  - Missing environment variables (STREAM_CHAT_API_KEY, STREAM_CHAT_SECRET)"
        exit 1
    fi
else
    # Fallback validation without jq
    if echo "$TOKEN_RESPONSE" | grep -q "token"; then
        echo -e "${GREEN}✅ Response contains token${NC}"
    else
        echo -e "${RED}❌ Response does not contain token${NC}"
        exit 1
    fi
fi

# Step 3: Test Token Validity (optional - requires Stream Chat SDK)
print_section "Step 3: Summary"

echo -e "${GREEN}✅ Backend Stream Chat token endpoint is working!${NC}"
echo ""
echo "Next steps:"
echo "  1. Test in the mobile app (iOS/Android)"
echo "  2. Verify real-time messaging works"
echo "  3. Test conversation creation"
echo "  4. Test message sending/receiving"
echo ""
echo "To test in app:"
echo "  1. Set BASE_URL in app to: $BASE_URL"
echo "  2. Login with the same credentials"
echo "  3. Navigate to Messages"
echo "  4. Check console logs for StreamChat connection"
echo ""

