# Curl Tests and Keys Verification

Use these tests to confirm that all required endpoints and keys for push and chat are working. Run them after config changes or before a release to avoid impacting application services.

---

## Summary: What Each Test Confirms

| Test | Confirms | Required for |
|------|----------|--------------|
| 1. Stream push providers | Stream has APNs (iOS) and Firebase (Android) configured and enabled | Chat push on iOS and Android |
| 2. Backend health | Backend is reachable and responding | App login, chat token, push token registration |
| 3. Android FCM config (local) | google-services.json, manifest, Gradle are set for FCM | Android build and push |
| 4. Backend chat token | Backend returns a valid Stream JWT and user id | Stream Chat connection |
| 5. Backend push registration | Backend accepts device token registration | Your own push (e.g. non-chat); Stream uses its own config |

---

## 1. Stream Chat push providers (iOS + Android)

**Purpose:** Verifies Stream has the correct push credentials so it can send chat notifications.

**Prerequisites:** `STREAM_API_SECRET` (Stream Dashboard → your app → Chat → API Keys). Do not commit this secret.

```bash
export STREAM_API_SECRET='your_stream_api_secret'
./test-stream-chat-push-config.sh
```

**Success:** HTTP 200; output shows APNs (iOS) and Firebase (Android) sections. No “No Firebase push provider found” for Android.

**Optional:** Set `STREAM_API_KEY` if your app uses a different key (default in script: `j8yy2mzarh3n`).

---

## 2. Backend health

**Purpose:** Confirms the backend the app talks to is up and responding.

**Replace** `BASE_URL` with your backend (e.g. staging or production).

```bash
BASE_URL="https://onecrew-backend-staging-309236356616.us-central1.run.app"
curl -sS -o /dev/null -w "%{http_code}\n" "${BASE_URL}/health"
```

**Success:** Output is `200`. Any other code or connection error indicates the backend is down or unreachable.

---

## 3. Android FCM config (local, no network)

**Purpose:** Verifies Android project has FCM files and manifest entries before building the APK.

```bash
./test-android-fcm-config.sh
```

**Success:** Script exits 0 and reports “Local Android FCM config looks good.”

---

## 4. Backend chat token (Stream JWT)

**Purpose:** Confirms the backend can issue a valid Stream Chat token so the app can connect and register for push.

**Prerequisites:** A valid **user access token** (e.g. from login). Get it by logging in via the app or your backend’s auth endpoint and copying the access token from the response.

```bash
BASE_URL="https://onecrew-backend-staging-309236356616.us-central1.run.app"
ACCESS_TOKEN="your_user_access_token_here"

curl -sS -X GET "${BASE_URL}/api/chat/token?profile_type=user" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json"
```

**Success:** JSON with `token`, `user_id`, and `api_key`. Example:

```json
{"success":true,"data":{"token":"...","user_id":"onecrew_user_...","api_key":"j8yy2mzarh3n"}}
```

If the backend uses different query params (e.g. `company_id` for company profile), adjust the URL. A 401 means the access token is missing or invalid.

---

## 5. Backend push token registration (optional)

**Purpose:** Confirms the backend accepts FCM/APNs token registration (used by the app for your own notifications; Stream chat push uses Stream’s config from test 1).

**Prerequisites:** Same `ACCESS_TOKEN`; a valid FCM token from the app (e.g. from log: `🔑 [FCM] Full token...`). Backend endpoint and body may differ; adapt to your API.

```bash
BASE_URL="https://onecrew-backend-staging-309236356616.us-central1.run.app"
ACCESS_TOKEN="your_user_access_token_here"
FCM_TOKEN="device_fcm_token_from_app_log"

curl -sS -X POST "${BASE_URL}/api/push/register" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"${FCM_TOKEN}\",\"platform\":\"android\",\"device_id\":\"curl-test\",\"app_version\":\"1.3.10\"}"
```

**Success:** 2xx response (e.g. 200 or 204). If your backend uses a different path or body (e.g. from onecrew-api-client), change the URL and payload accordingly.

---

## Keys and secrets (do not commit)

| Key / secret | Where used | How to verify |
|--------------|------------|----------------|
| **STREAM_API_SECRET** | `test-stream-chat-push-config.sh` only (not in app) | Run test 1; HTTP 200 and push providers in output. |
| **Firebase service account JSON** | Stream Dashboard (Firebase push config) | Test 1 shows Firebase provider. |
| **APNs .p8 key** | Firebase Cloud Messaging (Apple app config) + Stream (iOS push) | Test 1 shows APNs config; iOS device receives chat push. |
| **Backend base URL** | App and curl tests | Test 2 returns 200. |
| **User access token** | Tests 4 and 5 | From login response; test 4 returns chat token. |

---

## Safe to run anytime

- **Tests 1, 2, 3** do not modify app or backend state; they only read config or health.
- **Test 4** only reads a chat token; it does not change user or Stream state.
- **Test 5** registers a push token; use a test token or a dedicated test user if you want to avoid affecting real devices.

---

## After changing device registration (remove-before-add)

The app now removes the previous device from Stream before adding the new token on refresh. This does not require any new curl tests:

- Stream’s `addDevice` and `removeDevice` are called from the app only (with the user’s Stream JWT from your backend).
- Test 1 still confirms Stream is configured to send push; test 4 confirms the backend still issues valid Stream tokens so the app can connect and register devices.

Run test 1 and test 4 after backend or Stream config changes to confirm endpoints and keys are still correct.
