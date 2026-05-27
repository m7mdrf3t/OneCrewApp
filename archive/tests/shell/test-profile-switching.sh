#!/bin/bash

# Profile Switching Performance Test Script
# This script tests profile switching between user and company profiles
# It measures timing, checks for errors, and validates StreamChat connection

# Configuration
BACKEND_URL="https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app"
ENDPOINT_AUTH="/api/auth/signin"
ENDPOINT_TOKEN="/api/chat/token"
ENDPOINT_COMPANIES="/api/users"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TOTAL_SWITCHES=0
SUCCESSFUL_SWITCHES=0
FAILED_SWITCHES=0
TOTAL_TIME=0
MIN_TIME=999999
MAX_TIME=0

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

# Function to measure time
measure_time() {
    local start_time=$(date +%s%N)
    "$@"
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    echo $duration
}

# Function to login and get token
login() {
    local email=$1
    local password=$2
    
    print_section "Step 1: User Authentication"
    
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
        exit 1
    fi
    
    local token=$(echo "$response" | jq -r '.data.token // .token // empty' 2>/dev/null)
    local user_id=$(echo "$response" | jq -r '.data.user.id // .user.id // empty' 2>/dev/null)
    
    if [ -z "$token" ] || [ "$token" = "null" ]; then
        print_result "error" "Token not found in response"
        echo "$response" | jq . 2>/dev/null || echo "$response"
        exit 1
    fi
    
    print_result "success" "Login successful"
    echo -e "${BLUE}User ID: $user_id${NC}"
    echo -e "${BLUE}Token: ${token:0:20}...${NC}"
    
    echo "$token"
}

# Function to get user companies
get_user_companies() {
    local token=$1
    local user_id=$2
    
    print_section "Step 2: Fetching User Companies"
    
    local start_time=$(date +%s%N)
    local response=$(curl -s -X GET "${BACKEND_URL}${ENDPOINT_COMPANIES}/${user_id}/companies" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json")
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))
    
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BACKEND_URL}${ENDPOINT_COMPANIES}/${user_id}/companies" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json")
    
    if [ "$http_code" != "200" ]; then
        print_result "error" "Failed to get companies (HTTP $http_code)"
        echo "$response" | jq . 2>/dev/null || echo "$response"
        return 1
    fi
    
    # Parse response - Response structure: { "success": true, "data": [...] }
    # Each item: { "company_id": "...", "role": "owner", "company": { "id": "...", "name": "...", "logo_url": "..." } }
    local company_count=$(echo "$response" | jq '.data | length' 2>/dev/null || echo "0")
    
    print_result "success" "Fetched $company_count companies in ${duration}ms"
    
    if [ "$company_count" = "0" ] || [ -z "$company_count" ] || [ "$company_count" = "null" ]; then
        print_result "warning" "No companies found"
        return 1
    fi
    
    # Extract company IDs (owner/admin only)
    # Structure: .company_id (top level) or .company.id (nested)
    local company_ids=$(echo "$response" | jq -r '.data[] | select(.role == "owner" or .role == "admin") | (.company_id // .company.id // empty)' 2>/dev/null | grep -v '^$' | grep -v '^null$')
    
    if [ -z "$company_ids" ]; then
        print_result "warning" "No accessible companies found (owner/admin)"
        # Debug: show what we got
        echo -e "${YELLOW}Debug - First company structure:${NC}"
        echo "$response" | jq '.data[0] | {company_id, role, company_id_alt: .company.id}' 2>/dev/null || echo "$response" | jq '.data[0]' 2>/dev/null
        return 1
    fi
    
    # Get first company ID
    local first_company_id=$(echo "$company_ids" | head -1 | tr -d '"' | tr -d ' ')
    echo -e "${BLUE}Found accessible companies. Using: $first_company_id${NC}"
    echo "$first_company_id"
}

# Function to get StreamChat token
get_stream_chat_token() {
    local token=$1
    local profile_type=$2
    local company_id=$3
    
    local query_params=""
    if [ "$profile_type" = "company" ] && [ -n "$company_id" ]; then
        query_params="?profile_type=company&company_id=$(echo "$company_id" | jq -rR @uri)"
    elif [ "$profile_type" = "user" ]; then
        query_params="?profile_type=user"
    fi
    
    local start_time=$(date +%s%N)
    local response=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}${ENDPOINT_TOKEN}${query_params}" \
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
        return 1
    fi
    
    local stream_user_id=$(echo "$response" | jq -r '.data.user_id // empty' 2>/dev/null)
    local has_token=$(echo "$response" | jq -r '.data.token // empty' 2>/dev/null)
    
    if [ -z "$stream_user_id" ] || [ -z "$has_token" ]; then
        print_result "error" "Invalid token response"
        echo "$response" | jq . 2>/dev/null || echo "$response"
        return 1
    fi
    
    print_result "success" "Got StreamChat token for $profile_type profile in ${duration}ms"
    echo -e "${BLUE}StreamChat User ID: $stream_user_id${NC}"
    
    echo "$stream_user_id"
}

# Function to test profile switch
test_profile_switch() {
    local token=$1
    local user_id=$2
    local profile_type=$3
    local company_id=$4
    
    print_section "Testing Profile Switch: $profile_type"
    
    local start_time=$(date +%s%N)
    
    # Step 1: Get StreamChat token
    local stream_user_id=$(get_stream_chat_token "$token" "$profile_type" "$company_id")
    if [ $? -ne 0 ]; then
        return 1
    fi
    
    # Step 2: Verify token is correct
    if [ "$profile_type" = "company" ]; then
        if [[ ! "$stream_user_id" == *"company"* ]]; then
            print_result "error" "Expected company StreamChat ID, got: $stream_user_id"
            return 1
        fi
    else
        if [[ ! "$stream_user_id" == *"user"* ]]; then
            print_result "error" "Expected user StreamChat ID, got: $stream_user_id"
            return 1
        fi
    fi
    
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))
    
    TOTAL_SWITCHES=$((TOTAL_SWITCHES + 1))
    SUCCESSFUL_SWITCHES=$((SUCCESSFUL_SWITCHES + 1))
    TOTAL_TIME=$((TOTAL_TIME + duration))
    
    if [ $duration -lt $MIN_TIME ]; then
        MIN_TIME=$duration
    fi
    if [ $duration -gt $MAX_TIME ]; then
        MAX_TIME=$duration
    fi
    
    print_result "success" "Profile switch ($profile_type) completed in ${duration}ms"
    echo "$duration"
    return 0
}

# Main test function
main() {
    print_section "Profile Switching Performance Test"
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        print_result "error" "jq is required but not installed. Please install jq first."
        exit 1
    fi
    
    # Get credentials from user or use defaults
    if [ -z "$1" ] || [ -z "$2" ]; then
        echo -e "${YELLOW}Usage: $0 <email> <password>${NC}"
        echo -e "${YELLOW}Example: $0 user@example.com password123${NC}"
        exit 1
    fi
    
    local email=$1
    local password=$2
    
    # Login and get user ID
    print_section "Step 1: User Authentication"
    
    echo -e "${BLUE}Logging in as: $email${NC}"
    
    local login_response=$(curl -s -X POST "${BACKEND_URL}${ENDPOINT_AUTH}" \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"$email\", \"password\": \"$password\"}")
    
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BACKEND_URL}${ENDPOINT_AUTH}" \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"$email\", \"password\": \"$password\"}")
    
    if [ "$http_code" != "200" ]; then
        print_result "error" "Login failed (HTTP $http_code)"
        echo "$login_response" | jq . 2>/dev/null || echo "$login_response"
        exit 1
    fi
    
    local token=$(echo "$login_response" | jq -r '.data.token // .token // empty' 2>/dev/null)
    local user_id=$(echo "$login_response" | jq -r '.data.user.id // .user.id // empty' 2>/dev/null)
    
    if [ -z "$token" ] || [ "$token" = "null" ]; then
        print_result "error" "Token not found in response"
        echo "$login_response" | jq . 2>/dev/null || echo "$login_response"
        exit 1
    fi
    
    if [ -z "$user_id" ] || [ "$user_id" = "null" ]; then
        print_result "error" "User ID not found in response"
        echo "$login_response" | jq . 2>/dev/null || echo "$login_response"
        exit 1
    fi
    
    print_result "success" "Login successful"
    echo -e "${BLUE}User ID: $user_id${NC}"
    echo -e "${BLUE}Token: ${token:0:20}...${NC}"
    
    # Get user companies
    print_section "Step 2: Fetching User Companies"
    local company_id=$(get_user_companies "$token" "$user_id")
    local companies_result=$?
    
    if [ $companies_result -ne 0 ] || [ -z "$company_id" ]; then
        print_result "warning" "No companies available, testing user profile only"
        company_id=""
    else
        echo -e "${BLUE}Using company ID: $company_id${NC}"
    fi
    
    # Test multiple switches
    print_section "Step 3: Profile Switching Tests"
    
    local num_switches=${3:-5}  # Default to 5 switches
    echo -e "${BLUE}Running $num_switches profile switches...${NC}\n"
    
    for i in $(seq 1 $num_switches); do
        echo -e "\n${BLUE}--- Switch $i/$num_switches ---${NC}"
        
        # Switch to user profile
        echo -e "${BLUE}Testing user profile switch...${NC}"
        local user_duration=$(test_profile_switch "$token" "$user_id" "user" "")
        local user_result=$?
        if [ $user_result -ne 0 ] || [ -z "$user_duration" ]; then
            FAILED_SWITCHES=$((FAILED_SWITCHES + 1))
            echo -e "${RED}User profile switch failed${NC}"
        else
            echo -e "${GREEN}User profile switch: ${user_duration}ms${NC}"
        fi
        
        sleep 1  # Small delay between switches
        
        # Switch to company profile (if available)
        if [ -n "$company_id" ] && [ "$company_id" != "null" ]; then
            echo -e "${BLUE}Testing company profile switch (company: $company_id)...${NC}"
            local company_duration=$(test_profile_switch "$token" "$user_id" "company" "$company_id")
            local company_result=$?
            if [ $company_result -ne 0 ] || [ -z "$company_duration" ]; then
                FAILED_SWITCHES=$((FAILED_SWITCHES + 1))
                echo -e "${RED}Company profile switch failed${NC}"
            else
                echo -e "${GREEN}Company profile switch: ${company_duration}ms${NC}"
            fi
            sleep 1
        else
            echo -e "${YELLOW}Skipping company profile switch (no company ID)${NC}"
        fi
    done
    
    # Print summary
    print_section "Test Summary"
    
    echo -e "${BLUE}Total Switches: $TOTAL_SWITCHES${NC}"
    echo -e "${GREEN}Successful: $SUCCESSFUL_SWITCHES${NC}"
    echo -e "${RED}Failed: $FAILED_SWITCHES${NC}"
    
    if [ $SUCCESSFUL_SWITCHES -gt 0 ]; then
        local avg_time=$((TOTAL_TIME / SUCCESSFUL_SWITCHES))
        echo -e "${BLUE}Average Time: ${avg_time}ms${NC}"
        echo -e "${BLUE}Min Time: ${MIN_TIME}ms${NC}"
        echo -e "${BLUE}Max Time: ${MAX_TIME}ms${NC}"
        
        # Performance assessment
        if [ $avg_time -lt 1000 ]; then
            print_result "success" "Excellent performance (< 1s average)"
        elif [ $avg_time -lt 2000 ]; then
            print_result "success" "Good performance (< 2s average)"
        elif [ $avg_time -lt 5000 ]; then
            print_result "warning" "Acceptable performance (< 5s average)"
        else
            print_result "error" "Poor performance (> 5s average) - needs optimization"
        fi
    fi
    
    if [ $FAILED_SWITCHES -gt 0 ]; then
        print_result "error" "Some switches failed - check logs above"
        exit 1
    else
        print_result "success" "All tests passed!"
        exit 0
    fi
}

# Run main function
main "$@"

