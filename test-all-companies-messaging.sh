#!/bin/bash

# Comprehensive Company Profile Switching & Messaging Test Script
# Tests all companies for profile switching and messaging functionality
# Ensures no "tokens are not set" errors occur

# Configuration
BACKEND_URL="https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app"
ENDPOINT_AUTH="/api/auth/signin"
ENDPOINT_TOKEN="/api/chat/token"
ENDPOINT_COMPANIES="/api/users"
ENDPOINT_CONVERSATIONS="/api/chat/conversations"
ENDPOINT_MESSAGES="/api/chat/messages"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TOTAL_COMPANIES=0
SUCCESSFUL_SWITCHES=0
FAILED_SWITCHES=0
SUCCESSFUL_MESSAGES=0
FAILED_MESSAGES=0
COMPANIES_WITH_ERRORS=()

# Function to print section header
print_section() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Function to print test result
print_result() {
    local status=$1
    local message=$2
    if [ "$status" = "success" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "error" ]; then
        echo -e "${RED}❌ $message${NC}"
    elif [ "$status" = "warning" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    else
        echo -e "${BLUE}ℹ️  $message${NC}"
    fi
}

# Function to login and get token
login() {
    local email=$1
    local password=$2
    
    echo -e "${BLUE}Logging in as: $email${NC}"
    
    local response=$(curl -s -X POST "${BACKEND_URL}${ENDPOINT_AUTH}" \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"$email\", \"password\": \"$password\"}")
    
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BACKEND_URL}${ENDPOINT_AUTH}" \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"$email\", \"password\": \"$password\"}")
    
    if [ "$http_code" != "200" ]; then
        print_result "error" "Login failed (HTTP $http_code)"
        echo "$response" | jq . 2>/dev/null || echo "$response"
        return 1
    fi
    
    local token=$(echo "$response" | jq -r '.data.token // .token // empty' 2>/dev/null)
    local user_id=$(echo "$response" | jq -r '.data.user.id // .user.id // empty' 2>/dev/null)
    
    if [ -z "$token" ] || [ "$token" = "null" ]; then
        print_result "error" "Token not found in response"
        echo "$response" | jq . 2>/dev/null || echo "$response"
        return 1
    fi
    
    if [ -z "$user_id" ] || [ "$user_id" = "null" ]; then
        print_result "error" "User ID not found in response"
        echo "$response" | jq . 2>/dev/null || echo "$response"
        return 1
    fi
    
    print_result "success" "Login successful"
    echo "$token|$user_id"
}

# Function to get user companies
get_user_companies() {
    local token=$1
    local user_id=$2
    
    local response=$(curl -s -X GET "${BACKEND_URL}${ENDPOINT_COMPANIES}/${user_id}/companies" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json")
    
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BACKEND_URL}${ENDPOINT_COMPANIES}/${user_id}/companies" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json")
    
    if [ "$http_code" != "200" ]; then
        print_result "error" "Failed to get companies (HTTP $http_code)"
        return 1
    fi
    
    # Extract company IDs (owner/admin only)
    local company_ids=$(echo "$response" | jq -r '.data[] | select(.role == "owner" or .role == "admin") | (.company_id // .company.id // empty)' 2>/dev/null | grep -v '^$' | grep -v '^null$')
    
    if [ -z "$company_ids" ]; then
        print_result "warning" "No accessible companies found (owner/admin)"
        return 1
    fi
    
    echo "$company_ids"
}

# Function to test company profile switch
test_company_switch() {
    local token=$1
    local company_id=$2
    local company_name=$3
    
    echo -e "\n${BLUE}Testing: $company_name ($company_id)${NC}"
    
    # Get StreamChat token for company profile
    local start_time=$(date +%s%N)
    local response=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}${ENDPOINT_TOKEN}?profile_type=company&company_id=$(echo "$company_id" | jq -rR @uri)" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json")
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))
    
    # Extract HTTP code from response (last line)
    local http_code=$(echo "$response" | tail -1)
    # Remove HTTP code from response body
    response=$(echo "$response" | sed '$d')
    
    if [ "$http_code" != "200" ]; then
        print_result "error" "Failed to get StreamChat token (HTTP $http_code) in ${duration}ms"
        echo "$response" | jq . 2>/dev/null || echo "$response"
        FAILED_SWITCHES=$((FAILED_SWITCHES + 1))
        COMPANIES_WITH_ERRORS+=("$company_name (token error)")
        return 1
    fi
    
    local stream_user_id=$(echo "$response" | jq -r '.data.user_id // empty' 2>/dev/null)
    local has_token=$(echo "$response" | jq -r '.data.token // empty' 2>/dev/null)
    
    if [ -z "$stream_user_id" ] || [ -z "$has_token" ]; then
        print_result "error" "Invalid token response"
        echo "$response" | jq . 2>/dev/null || echo "$response"
        FAILED_SWITCHES=$((FAILED_SWITCHES + 1))
        COMPANIES_WITH_ERRORS+=("$company_name (invalid token)")
        return 1
    fi
    
    # Verify it's a company StreamChat ID
    if [[ ! "$stream_user_id" == *"company"* ]]; then
        print_result "error" "Expected company StreamChat ID, got: $stream_user_id"
        FAILED_SWITCHES=$((FAILED_SWITCHES + 1))
        COMPANIES_WITH_ERRORS+=("$company_name (wrong user ID format)")
        return 1
    fi
    
    print_result "success" "Company profile switch successful in ${duration}ms"
    echo -e "${BLUE}  StreamChat User ID: $stream_user_id${NC}"
    SUCCESSFUL_SWITCHES=$((SUCCESSFUL_SWITCHES + 1))
    echo "$stream_user_id"
}

# Function to test sending message from company to user
test_send_message() {
    local token=$1
    local company_id=$2
    local company_name=$3
    local recipient_id=$4
    local recipient_name=$5
    
    echo -e "${BLUE}  Testing message: $company_name → $recipient_name${NC}"
    
    # Create conversation
    local start_time=$(date +%s%N)
    local conversation_response=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}${ENDPOINT_CONVERSATIONS}" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "{
            \"conversation_type\": \"user_company\",
            \"participant_ids\": [\"$recipient_id\"],
            \"company_id\": \"$company_id\"
        }")
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))
    
    # Extract HTTP code
    local http_code=$(echo "$conversation_response" | tail -1)
    conversation_response=$(echo "$conversation_response" | sed '$d')
    
    if [ "$http_code" != "200" ]; then
        print_result "error" "Failed to create conversation (HTTP $http_code) in ${duration}ms"
        echo "$conversation_response" | jq . 2>/dev/null || echo "$conversation_response"
        FAILED_MESSAGES=$((FAILED_MESSAGES + 1))
        return 1
    fi
    
    local conversation_id=$(echo "$conversation_response" | jq -r '.data.conversation_id // .data.id // empty' 2>/dev/null)
    
    if [ -z "$conversation_id" ] || [ "$conversation_id" = "null" ]; then
        print_result "error" "Conversation ID not found in response"
        echo "$conversation_response" | jq . 2>/dev/null || echo "$conversation_response"
        FAILED_MESSAGES=$((FAILED_MESSAGES + 1))
        return 1
    fi
    
    print_result "success" "Conversation created in ${duration}ms (ID: $conversation_id)"
    SUCCESSFUL_MESSAGES=$((SUCCESSFUL_MESSAGES + 1))
    echo "$conversation_id"
}

# Main test function
main() {
    print_section "Company Profile Switching & Messaging Test"
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        print_result "error" "jq is required but not installed. Please install jq first."
        exit 1
    fi
    
    # Get credentials
    if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ]; then
        echo -e "${YELLOW}Usage: $0 <admin_email> <admin_password> <user1_email> <user1_password> [user2_email] [user2_password]${NC}"
        echo -e "${YELLOW}Example: $0 admin@example.com pass123 user1@example.com pass123 user2@example.com pass123${NC}"
        exit 1
    fi
    
    local admin_email=$1
    local admin_password=$2
    local user1_email=$3
    local user1_password=$4
    local user2_email=${5:-""}
    local user2_password=${6:-""}
    
    # Login as admin
    print_section "Step 1: Admin Authentication"
    local admin_auth=$(login "$admin_email" "$admin_password")
    if [ $? -ne 0 ]; then
        exit 1
    fi
    local admin_token=$(echo "$admin_auth" | cut -d'|' -f1)
    local admin_user_id=$(echo "$admin_auth" | cut -d'|' -f2)
    
    # Get admin companies
    print_section "Step 2: Fetching Admin Companies"
    local companies_response=$(curl -s -X GET "${BACKEND_URL}${ENDPOINT_COMPANIES}/${admin_user_id}/companies" \
        -H "Authorization: Bearer $admin_token" \
        -H "Content-Type: application/json")
    
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BACKEND_URL}${ENDPOINT_COMPANIES}/${admin_user_id}/companies" \
        -H "Authorization: Bearer $admin_token" \
        -H "Content-Type: application/json")
    
    if [ "$http_code" != "200" ]; then
        print_result "error" "Failed to get companies (HTTP $http_code)"
        exit 1
    fi
    
    # Extract company IDs (owner/admin only)
    local company_ids=$(echo "$companies_response" | jq -r '.data[] | select(.role == "owner" or .role == "admin") | (.company_id // .company.id // empty)' 2>/dev/null | grep -v '^$' | grep -v '^null$')
    
    if [ -z "$company_ids" ]; then
        print_result "error" "No accessible companies found (owner/admin)"
        exit 1
    fi
    
    local company_count=$(echo "$company_ids" | wc -l | tr -d ' ')
    TOTAL_COMPANIES=$company_count
    print_result "success" "Found $company_count companies"
    
    # Login as user1
    print_section "Step 3: User1 Authentication"
    local user1_auth=$(login "$user1_email" "$user1_password")
    if [ $? -ne 0 ]; then
        exit 1
    fi
    local user1_token=$(echo "$user1_auth" | cut -d'|' -f1)
    local user1_id=$(echo "$user1_auth" | cut -d'|' -f2)
    
    # Login as user2 (if provided)
    local user2_id=""
    local user2_token=""
    if [ -n "$user2_email" ] && [ -n "$user2_password" ]; then
        print_section "Step 4: User2 Authentication"
        local user2_auth=$(login "$user2_email" "$user2_password")
        if [ $? -eq 0 ]; then
            user2_token=$(echo "$user2_auth" | cut -d'|' -f1)
            user2_id=$(echo "$user2_auth" | cut -d'|' -f2)
        fi
    fi
    
    # Test each company
    print_section "Step 5: Testing All Companies"
    
    # Convert company_ids to array for proper iteration
    local company_array=()
    while IFS= read -r line; do
        if [ -n "$line" ]; then
            company_array+=("$line")
        fi
    done <<< "$company_ids"
    
    for company_id in "${company_array[@]}"; do
        if [ -z "$company_id" ]; then
            continue
        fi
        
        # Get company name from companies response
        local company_name=$(echo "$companies_response" | jq -r ".data[] | select((.company_id // .company.id // empty) == \"$company_id\") | (.company.name // .name // \"Company $company_id\")" 2>/dev/null)
        
        if [ -z "$company_name" ] || [ "$company_name" = "null" ] || [ "$company_name" = "" ]; then
            # Try alternative extraction
            company_name=$(echo "$companies_response" | jq -r ".data[] | select(.company_id == \"$company_id\" or .company.id == \"$company_id\") | .company.name" 2>/dev/null)
            if [ -z "$company_name" ] || [ "$company_name" = "null" ]; then
                company_name="Company ${company_id:0:8}..."
            fi
        fi
        
        echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}Company: $company_name${NC}"
        echo -e "${BLUE}ID: $company_id${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        
        # Test company profile switch
        local stream_user_id=$(test_company_switch "$admin_token" "$company_id" "$company_name")
        local switch_result=$?
        
        if [ $switch_result -eq 0 ] && [ -n "$stream_user_id" ]; then
            # Test sending message to user1
            echo -e "${BLUE}  Testing messaging functionality...${NC}"
            test_send_message "$admin_token" "$company_id" "$company_name" "$user1_id" "User1"
            
            # Test sending message to user2 (if available)
            if [ -n "$user2_id" ]; then
                test_send_message "$admin_token" "$company_id" "$company_name" "$user2_id" "User2"
            fi
        else
            print_result "warning" "Skipping messaging tests due to switch failure"
        fi
        
        sleep 1  # Small delay between companies
    done
    
    # Print summary
    print_section "Test Summary"
    
    echo -e "${BLUE}Total Companies: $TOTAL_COMPANIES${NC}"
    echo -e "${GREEN}Successful Switches: $SUCCESSFUL_SWITCHES${NC}"
    echo -e "${RED}Failed Switches: $FAILED_SWITCHES${NC}"
    echo -e "${GREEN}Successful Messages: $SUCCESSFUL_MESSAGES${NC}"
    echo -e "${RED}Failed Messages: $FAILED_MESSAGES${NC}"
    
    if [ ${#COMPANIES_WITH_ERRORS[@]} -gt 0 ]; then
        echo -e "\n${RED}Companies with errors:${NC}"
        for company in "${COMPANIES_WITH_ERRORS[@]}"; do
            echo -e "${RED}  - $company${NC}"
        done
    fi
    
    # Performance assessment
    if [ $FAILED_SWITCHES -eq 0 ] && [ $FAILED_MESSAGES -eq 0 ]; then
        print_result "success" "All tests passed! No errors detected."
        exit 0
    else
        print_result "error" "Some tests failed. Please review the errors above."
        exit 1
    fi
}

# Run main function
main "$@"

