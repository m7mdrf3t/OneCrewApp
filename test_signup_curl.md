# Signup API Test - cURL Commands

## Test with a New Email (Should Succeed)

```bash
curl -X POST "https://onecrew-backend-309236356616.us-central1.run.app/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test'$(date +%s)'@datehype.com",
    "name": "TestUser",
    "password": "Password123",
    "category": "crew",
    "primary_role": "director"
  }'
```

## Test with Existing Email (Should Return 409)

```bash
curl -X POST "https://onecrew-backend-309236356616.us-central1.run.app/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nahib26220@datehype.com",
    "name": "TestUser",
    "password": "Password123",
    "category": "crew",
    "primary_role": "director"
  }'
```

## Test with Specific Email

Replace `YOUR_EMAIL@example.com` with your test email:

```bash
curl -X POST "https://onecrew-backend-309236356616.us-central1.run.app/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "YOUR_EMAIL@example.com",
    "name": "TestUser",
    "password": "Password123",
    "category": "crew",
    "primary_role": "director"
  }'
```

## Expected Responses

### Success (201 Created)
```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "...",
    "name": "..."
  },
  "token": "..."
}
```

### Email Already Exists (409 Conflict)
```json
{
  "success": false,
  "error": "User with this email already exists"
}
```

## Available Categories
- `crew`
- `talent`
- `company`

## Available Primary Roles (for crew)
- `actor`
- `voice_actor`
- `director`
- `dop`
- `editor`
- `producer`
- `scriptwriter`
- `gaffer`
- `grip`
- `sound_engineer`
- `makeup_artist`
- `stylist`
- `vfx`
- `colorist`

## Available Primary Roles (for talent)
- `actor`
- `voice_actor`
- `singer`
- `dancer`
- `model`




















