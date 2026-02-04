#!/usr/bin/env bash
#
# Verify Stream Chat iOS push (APNs) configuration via API.
# Uses: GET https://chat.stream-io-api.com/push_providers
#
# Prerequisites:
#   - STREAM_API_KEY    (default: j8yy2mzarh3n from this app)
#   - STREAM_API_SECRET (required; get from Stream Chat Dashboard)
#
# Usage:
#   export STREAM_API_SECRET='your_secret_here'
#   ./test-stream-chat-push-config.sh
#
# Or with both:
#   STREAM_API_KEY=j8yy2mzarh3n STREAM_API_SECRET='your_secret' ./test-stream-chat-push-config.sh
#

set -e

API_KEY="${STREAM_API_KEY:-j8yy2mzarh3n}"
API_SECRET="${STREAM_API_SECRET:-}"

if [ -z "$API_SECRET" ]; then
  echo "❌ STREAM_API_SECRET is not set."
  echo "   Get it from: https://dashboard.getstream.io/ → your app → Chat → API Keys"
  echo "   Then run: export STREAM_API_SECRET='your_secret'"
  exit 1
fi

# Expected bundle ID for this app (must match Stream Dashboard iOS config)
EXPECTED_BUNDLE_ID="com.minaezzat.onesteps"

echo "🔑 Using API Key: $API_KEY"
echo "📡 Fetching push_providers..."
echo ""

# Generate server-side JWT (HS256)
# HEADER and PAYLOAD are base64url-encoded (no padding)
HEADER='{"alg":"HS256","typ":"JWT"}'
PAYLOAD='{"server":true}'

HEADER_B64=$(echo -n "$HEADER" | openssl base64 | tr -d '=\n' | tr '/+' '_-')
PAYLOAD_B64=$(echo -n "$PAYLOAD" | openssl base64 | tr -d '=\n' | tr '/+' '_-')

SIGNATURE=$(echo -n "${HEADER_B64}.${PAYLOAD_B64}" \
  | openssl dgst -sha256 -hmac "$API_SECRET" -binary \
  | openssl base64 | tr -d '=\n' | tr '/+' '_-')

TOKEN="${HEADER_B64}.${PAYLOAD_B64}.${SIGNATURE}"

# Fetch push providers (Stream expects Stream-Auth-Type: jwt and Authorization without Bearer)
TMP_BODY=$(mktemp)
HTTP_CODE=$(curl -sS -o "$TMP_BODY" -w "%{http_code}" -X GET \
  "https://chat.stream-io-api.com/push_providers?api_key=${API_KEY}" \
  -H "Accept: application/json" \
  -H "Stream-Auth-Type: jwt" \
  -H "Authorization: $TOKEN")

HTTP_BODY=$(cat "$TMP_BODY")
rm -f "$TMP_BODY"

if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ API returned HTTP $HTTP_CODE"
  echo "$HTTP_BODY" | jq . 2>/dev/null || echo "$HTTP_BODY"
  exit 1
fi

echo "✅ HTTP 200 - Push providers response:"
echo ""
if command -v jq >/dev/null 2>&1; then
  echo "$HTTP_BODY" | jq .
else
  echo "$HTTP_BODY"
  echo ""
  echo "ℹ️  Install jq for pretty-print and APNs summary (e.g. brew install jq)"
fi
echo ""

# Parse and sanity-check iOS (APNs) config (requires jq)
if ! command -v jq >/dev/null 2>&1; then
  echo "Skipping APNs summary (jq not installed). Check the JSON above for push_providers[].type apn_auth/apn."
  exit 0
fi

APN_AUTH=$(echo "$HTTP_BODY" | jq -r '.push_providers[]? | select(.type == "apn_auth") | .' 2>/dev/null)
APN_LEGACY=$(echo "$HTTP_BODY" | jq -r '.push_providers[]? | select(.type == "apn") | .' 2>/dev/null)

if [ -n "$APN_AUTH" ] && [ "$APN_AUTH" != "null" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📱 iOS push (APNs) – Auth Key (recommended)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  IS_ENABLED=$(echo "$HTTP_BODY" | jq -r '.push_providers[]? | select(.type == "apn_auth") | .is_enabled')
  KEY_ID=$(echo "$HTTP_BODY" | jq -r '.push_providers[]? | select(.type == "apn_auth") | .apn_auth_key_id')
  TEAM_ID=$(echo "$HTTP_BODY" | jq -r '.push_providers[]? | select(.type == "apn_auth") | .apn_auth_team_id')
  BUNDLE_ID=$(echo "$HTTP_BODY" | jq -r '.push_providers[]? | select(.type == "apn_auth") | .apn_bundle_id')
  ENV=$(echo "$HTTP_BODY" | jq -r '.push_providers[]? | select(.type == "apn_auth") | .environment')
  CREATED=$(echo "$HTTP_BODY" | jq -r '.push_providers[]? | select(.type == "apn_auth") | .created_at')

  echo "  is_enabled:    $IS_ENABLED"
  echo "  apn_auth_key_id: $KEY_ID"
  echo "  apn_auth_team_id: $TEAM_ID"
  echo "  apn_bundle_id:  $BUNDLE_ID"
  echo "  environment:   $ENV"
  echo "  created_at:    $CREATED"
  echo ""

  FAIL=0
  if [ "$IS_ENABLED" != "true" ]; then
    echo "  ⚠️  is_enabled is not true – enable in Dashboard (Push Notifications → iOS)"
    FAIL=1
  fi
  if [ -z "$KEY_ID" ] || [ "$KEY_ID" = "null" ]; then
    echo "  ⚠️  apn_auth_key_id missing – upload .p8 key in Dashboard"
    FAIL=1
  fi
  if [ -z "$TEAM_ID" ] || [ "$TEAM_ID" = "null" ]; then
    echo "  ⚠️  apn_auth_team_id missing – set Team ID in Dashboard"
    FAIL=1
  fi
  if [ -z "$BUNDLE_ID" ] || [ "$BUNDLE_ID" = "null" ]; then
    echo "  ⚠️  apn_bundle_id missing – set Bundle ID in Dashboard"
    FAIL=1
  elif [ "$BUNDLE_ID" != "$EXPECTED_BUNDLE_ID" ]; then
    echo "  ⚠️  apn_bundle_id is '$BUNDLE_ID'; app expects '$EXPECTED_BUNDLE_ID'"
    FAIL=1
  else
    echo "  ✅ Bundle ID matches app: $EXPECTED_BUNDLE_ID"
  fi
  if [ "$ENV" = "development" ]; then
    echo "  ℹ️  environment is development (use production for TestFlight/App Store)"
  fi
  if [ $FAIL -eq 0 ]; then
    echo ""
    echo "  ✅ APNs config looks valid. Device registration + real message test still required."
  fi
elif [ -n "$APN_LEGACY" ] && [ "$APN_LEGACY" != "null" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📱 iOS push (APNs) – Certificate (legacy)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "$HTTP_BODY" | jq '.push_providers[] | select(.type == "apn")'
  echo "  ℹ️  Apple recommends switching to .p8 auth key in Dashboard."
else
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌ No iOS (APNs) push provider found."
  echo "   Upload .p8 key, Key ID, Team ID, Bundle ID in:"
  echo "   https://dashboard.getstream.io/ → your app → Push Notifications → iOS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi

# Optional: show Firebase if present
FIREBASE=$(echo "$HTTP_BODY" | jq -r '.push_providers[]? | select(.type == "firebase") | .' 2>/dev/null)
if [ -n "$FIREBASE" ] && [ "$FIREBASE" != "null" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔥 Firebase (Android) push"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "$HTTP_BODY" | jq '.push_providers[] | select(.type == "firebase")'
fi

echo ""
echo "Done."
