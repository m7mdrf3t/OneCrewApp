#!/bin/bash

# Script to test what company types are returned from the API
# This helps diagnose if the backend is returning all company types

BASE_URL="https://onecrew-backend-309236356616.us-central1.run.app"

echo "=========================================="
echo "Company Types Endpoint Diagnostic"
echo "=========================================="
echo ""

# Test 1: Get all company types
echo "1. Testing GET /api/company-types"
echo "-----------------------------------"
curl -s -X GET "${BASE_URL}/api/company-types" \
  -H "Content-Type: application/json" | jq '.' || echo "Failed to parse response"
echo ""
echo ""

# Test 2: Get companies with Studios & Agencies filter
echo "2. Testing GET /api/companies with Studios & Agencies filter"
echo "-----------------------------------"
echo "Filter: production_house,agency,casting_agency,studio,management_company"
curl -s -X GET "${BASE_URL}/api/companies?subcategory=production_house,agency,casting_agency,studio,management_company&limit=100" \
  -H "Content-Type: application/json" | jq '.data[0:5] | .[] | {id, name, subcategory, company_type_info}' || echo "Failed to parse response"
echo ""
echo ""

# Test 3: Get all companies (no filter) to see what subcategories exist
echo "3. Testing GET /api/companies (all) to see unique subcategories"
echo "-----------------------------------"
curl -s -X GET "${BASE_URL}/api/companies?limit=1000" \
  -H "Content-Type: application/json" | jq '[.data[] | .subcategory] | unique' || echo "Failed to parse response"
echo ""
echo ""

# Test 4: Count companies by subcategory
echo "4. Count companies by subcategory"
echo "-----------------------------------"
curl -s -X GET "${BASE_URL}/api/companies?limit=1000" \
  -H "Content-Type: application/json" | jq '[.data[] | .subcategory] | group_by(.) | map({type: .[0], count: length})' || echo "Failed to parse response"
echo ""
echo ""

echo "=========================================="
echo "Diagnostic Complete"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Check if /api/company-types returns all types from database"
echo "2. Check if unique subcategories match what's expected"
echo "3. Verify that all Studios & Agencies types are included in the filter"


