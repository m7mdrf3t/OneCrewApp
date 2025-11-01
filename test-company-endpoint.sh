#!/bin/bash

# Test script for /api/companies endpoint
# Usage: ./test-company-endpoint.sh <YOUR_AUTH_TOKEN>

BASE_URL="https://onecrewbe-production.up.railway.app"
ENDPOINT="/api/companies"

# Get token from argument or prompt
if [ -z "$1" ]; then
    echo "Usage: $0 <AUTH_TOKEN>"
    echo ""
    echo "Example:"
    echo "  $0 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    exit 1
fi

TOKEN="$1"

echo "Testing: POST ${BASE_URL}${ENDPOINT}"
echo "=================================="
echo ""

# Test with minimal required fields
echo "Test 1: Minimal required fields"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Test Company",
    "subcategory": "production_house"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -v

echo ""
echo "=================================="
echo ""

# Test with all optional fields
echo "Test 2: Full company data"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Full Test Company",
    "subcategory": "agency",
    "description": "A test company description",
    "bio": "This is a test company bio",
    "website_url": "https://example.com",
    "location_text": "Cairo, Egypt",
    "email": "test@example.com",
    "phone": "+201234567890",
    "establishment_date": "2020-01-01",
    "contact_email": "contact@example.com",
    "contact_phone": "+201234567891",
    "contact_address": "123 Test Street, Cairo"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -v

echo ""
echo "=================================="
echo ""

# Test without authentication
echo "Test 3: Without authentication (should fail)"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Unauthorized Test",
    "subcategory": "studio"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -v

