# Verify Stream Chat iOS Push (APNs) Config with curl

This checks that your **.p8 key, Key ID, Team ID, and bundle ID** are correctly configured in Stream Chat for iOS push.

---

## What you can verify via API

- APNs is enabled for your app  
- Stream has a valid APNs configuration (auth key or certificate)  
- Environment (production vs development)  
- Bundle ID matches your app (`com.minaezzat.onesteps`)  
- Key ID and Team ID are present  

You cannot verify Apple-side delivery or end-to-end delivery; that requires device testing.

---

## Prerequisites

- **API Key** – from Stream Chat Dashboard (this app uses `j8yy2mzarh3n`)  
- **API Secret** – from Dashboard → your app → Chat → API Keys (do not commit; use env only)  

---

## 1. Run the script (recommended)

```bash
# Set secret (get from https://dashboard.getstream.io/ → your app → API Keys)
export STREAM_API_SECRET='your_api_secret_here'

# Run from project root
chmod +x test-stream-chat-push-config.sh
./test-stream-chat-push-config.sh
```

Optional: override API key and bundle ID check uses `com.minaezzat.onesteps` by default.

```bash
STREAM_API_KEY=j8yy2mzarh3n STREAM_API_SECRET='your_secret' ./test-stream-chat-push-config.sh
```

---

## 2. Manual curl (same flow)

### Generate server JWT

```bash
HEADER='{"alg":"HS256","typ":"JWT"}'
PAYLOAD='{"server":true}'

HEADER_B64=$(echo -n $HEADER | openssl base64 | tr -d '=' | tr '/+' '_-')
PAYLOAD_B64=$(echo -n $PAYLOAD | openssl base64 | tr -d '=' | tr '/+' '_-')

SIGNATURE=$(echo -n "$HEADER_B64.$PAYLOAD_B64" \
  | openssl dgst -sha256 -hmac "YOUR_API_SECRET" -binary \
  | openssl base64 | tr -d '=' | tr '/+' '_-')

TOKEN="$HEADER_B64.$PAYLOAD_B64.$SIGNATURE"
```

### Fetch push providers

Stream expects `Stream-Auth-Type: jwt` and `Authorization: <JWT>` (no `Bearer` prefix).

```bash
curl -sS -X GET \
  "https://chat.stream-io-api.com/push_providers?api_key=j8yy2mzarh3n" \
  -H "Accept: application/json" \
  -H "Stream-Auth-Type: jwt" \
  -H "Authorization: $TOKEN"
```

---

## 3. How to read the response

### APNs Auth Key (recommended) – what you want to see

```json
{
  "push_providers": [
    {
      "name": "apn_auth",
      "type": "apn_auth",
      "is_enabled": true,
      "apn_auth_key_id": "ABC123DEFG",
      "apn_auth_team_id": "XYZ987654",
      "apn_bundle_id": "com.minaezzat.onesteps",
      "environment": "production",
      "created_at": "2024-10-12T08:31:22Z"
    }
  ]
}
```

- **is_enabled: true** – push is on  
- **apn_auth_key_id** – Key ID from your .p8 upload  
- **apn_auth_team_id** – Apple Team ID  
- **apn_bundle_id** – must be `com.minaezzat.onesteps` for this app  
- **environment** – use `production` for TestFlight/App Store  

### Problems to watch for

| Symptom | Meaning |
|--------|--------|
| Empty `push_providers` or no `apn_auth` | No APNs config uploaded – add .p8, Key ID, Team ID, Bundle ID in Dashboard |
| **is_enabled: false** | Push exists but is disabled – enable in Dashboard |
| Wrong **environment** | Use production for TestFlight/App Store |
| Missing **apn_bundle_id** or wrong value | Set/correct Bundle ID in Dashboard to `com.minaezzat.onesteps` |

---

## 4. Optional: check Firebase (Android)

```bash
curl -s -X GET \
  "https://chat.stream-io-api.com/push_providers?api_key=j8yy2mzarh3n" \
  -H "Authorization: Bearer $TOKEN" | jq '.push_providers[] | select(.type=="firebase")'
```

---

## 5. What this does not replace

Even if the API response looks correct, you still need to:

- Register device tokens on the client (`client.addDevice(apnsToken, 'apn')` on iOS)  
- Test with a real push (send a message to a channel the user is in, app in background)  

Use this curl/script to sanity-check that Stream has the right APNs config; use device testing to confirm delivery.
