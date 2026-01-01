#!/bin/bash

# Test Signup API Endpoint
# This script tests the signup endpoint with a new email

API_URL="https://onecrew-backend-309236356616.us-central1.run.app/api/auth/signup"

# Generate a unique email with timestamp
TIMESTAMP=$(date +%s)
TEST_EMAIL="test${TIMESTAMP}@datehype.com"
TEST_NAME="TestUser${TIMESTAMP}"

echo "Testing signup with email: $TEST_EMAIL"
echo ""

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"name\": \"$TEST_NAME\",
    \"password\": \"Password123\",
    \"category\": \"crew\",
    \"primary_role\": \"director\"
  }" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -v

echo ""
echo "---"
echo "To test with a specific email, modify TEST_EMAIL variable above"
echo "To test the existing email that's failing, use:"
echo "curl -X POST \"$API_URL\" -H \"Content-Type: application/json\" -d '{\"email\":\"nahib26220@datehype.com\",\"name\":\"TestUser\",\"password\":\"Password123\",\"category\":\"crew\",\"primary_role\":\"director\"}'"





















