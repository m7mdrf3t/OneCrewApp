# Quick curl Commands to Test /api/companies Endpoint

## Base URL
```
https://onecrew-backend-309236356616.us-central1.run.app
```

## 1. Quick Test (Minimal Required Fields)

Replace `YOUR_TOKEN_HERE` with your actual JWT token from the app:

```bash
curl -X POST "https://onecrew-backend-309236356616.us-central1.run.app/api/companies" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Test Company",
    "subcategory": "production_house"
  }'
```

## 2. Full Test (All Fields)

```bash
curl -X POST "https://onecrew-backend-309236356616.us-central1.run.app/api/companies" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
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
  }'
```

## 3. Quick One-Liner (Verbose Output)

```bash
curl -v -X POST "https://onecrew-backend-309236356616.us-central1.run.app/api/companies" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"name":"Test Company","subcategory":"production_house"}'
```

## 4. Using the Test Script

If you have the test script, run:
```bash
./test-company-endpoint.sh YOUR_TOKEN_HERE
```

## Available Subcategories

- `production_house`
- `agency`
- `academy`
- `studio`
- `casting_agency`
- `management_company`
- `other`

## Getting Your Token

From the terminal output you shared, your token was:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZDkyZjlmNy0xZTllLTQ4OWItYjg1Mi02ODg1ZDU5OThkZTMiLCJlbWFpbCI6Im03bWRyZjN0MEBnbWFpbC5jb20iLCJjYXRlZ29yeSI6InRhbGVudCIsInJvbGUiOiJhY3RvciIsImlhdCI6MTc2MTk1NTY4OSwiZXhwIjoxNzYyNTYwNDg5fQ.44KhGslGTyxeyDNLS3JHTAI11srJOx8kiia2-ARiglo
```

**Note:** This token may be expired. Get a fresh token from the app logs or by logging in.

## Expected Responses

### Success (200/201):
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Test Company",
    "subcategory": "production_house",
    ...
  }
}
```

### Endpoint Not Found (404):
```json
{
  "error": "Route /api/companies not found",
  "success": false
}
```

### Unauthorized (401):
```json
{
  "error": "Unauthorized",
  "success": false
}
```

