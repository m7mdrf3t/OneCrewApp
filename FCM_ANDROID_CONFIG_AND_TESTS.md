# FCM Android: Configuration Checklist and Curl Tests

Before building the APK, ensure all FCM-related configuration is set for Android and run the curl/script tests below.

---

## 1. FCM configuration checklist (Android)

### 1.1 Project files

| Check | Location | What to verify |
|-------|----------|----------------|
| **google-services.json** | `android/app/google-services.json` | Present; `project_id` = your Firebase project (e.g. `steps-cfc27`); `client[0].client_info.package_name` = `com.minaezzat.onesteps`. |
| **AndroidManifest** | `android/app/src/main/AndroidManifest.xml` | Has `POST_NOTIFICATIONS` (Android 13+); has `com.google.firebase.messaging.default_notification_icon` and `default_notification_color`. |
| **Build** | `android/app/build.gradle` | `apply plugin: "com.google.gms.google-services"`. Root `android/build.gradle` has `classpath('com.google.gms:google-services:4.4.0')`. |

### 1.2 Firebase Console

- **Project**: Same as `project_id` in `google-services.json`.
- **Android app**: Registered with package name `com.minaezzat.onesteps`; `google-services.json` was downloaded from this app.
- **Cloud Messaging**: No extra Android-specific key needed in Firebase for the app; FCM uses the project’s default credentials. For **Stream Chat** to send pushes, Stream must have FCM credentials (see 1.3).

### 1.3 Stream Chat Dashboard (required for chat push)

- **Push Notifications → Android / Firebase**: FCM provider added and **enabled** (FCM server key or Firebase v1 service account).
- So that the script check passes: run `./test-stream-chat-push-config.sh` and confirm the “Android push (FCM / Firebase)” section shows **is_enabled: true**.

### 1.4 Backend (onecrew-api-client)

- Backend accepts FCM token registration for platform `android` (e.g. `pushNotifications.registerDeviceToken(token, 'android', deviceId, appVersion)`).
- Backend stores/uses the token for your own notifications; Stream Chat uses its own FCM config in the Dashboard to send chat pushes.

---

## 2. Curl / script tests

### 2.1 Stream Chat push providers (iOS + Android)

Verifies Stream has both APNs (iOS) and FCM (Android) push configured.

**Prerequisites:** `STREAM_API_SECRET` (from Stream Chat Dashboard → API Keys).

```bash
export STREAM_API_SECRET='your_stream_api_secret'
./test-stream-chat-push-config.sh
```

**What to check:**

- **iOS**: APNs (apn_auth) present, `is_enabled: true`, `apn_bundle_id` = `com.minaezzat.onesteps`.
- **Android**: Firebase push provider present, `is_enabled: true`. If “No Firebase (Android) push provider found”, add and enable FCM in Stream Dashboard → Push Notifications → Android/Firebase.

**Optional (same script, jq):**  
If you have `jq` installed, the script prints a short summary and validation for both iOS and Android.

---

### 2.2 Backend health (optional)

If your backend has a health endpoint:

```bash
curl -sS -o /dev/null -w "%{http_code}" "https://onecrew-backend-staging-309236356616.us-central1.run.app/api/health"
```

Expect `200`. Replace the URL if you use a different base URL.

---

### 2.3 Backend push token registration (optional)

The app calls the backend to register the FCM token (via onecrew-api-client). To test the backend directly you need:

- A valid auth token (e.g. from a real login).
- The exact endpoint and body your backend expects (see your backend docs or onecrew-api-client implementation).

Example pattern (adapt URL and body to your API):

```bash
# Replace ACCESS_TOKEN and FCM_TOKEN with real values from a logged-in session and app log (🔑 [FCM] Full token...).
# Endpoint may differ; check backend or onecrew-api-client for pushNotifications.registerDeviceToken.
curl -sS -X POST "https://YOUR_BACKEND_URL/api/push/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -d '{"token":"FCM_TOKEN","platform":"android","device_id":"test-device","app_version":"1.3.10"}'
```

If the backend returns 2xx, token registration is accepted.

---

### 2.4 FCM delivery test (Firebase Console – recommended)

No curl needed; uses Firebase Console to confirm FCM → device works:

1. Install the app on a physical Android device (or build APK and install).
2. Log in and allow notifications; in logs find: `🔑 [FCM] Full token (copy for Firebase Console...)`.
3. Copy the full FCM token.
4. **Firebase Console** → **Engage** → **Messaging** → **New campaign** → **Firebase Notification messages** → **Send test message** → paste token → send.
5. With the app in background or killed, the device should receive the notification.

This confirms: Firebase project, `google-services.json`, and app FCM registration are correct.

---

### 2.5 FCM v1 API send (optional, with service account)

If you have a Firebase service account JSON (e.g. for a server):

1. Get an OAuth2 access token for `https://www.googleapis.com/auth/firebase.messaging`.
2. Call FCM v1 HTTP API:

```bash
# After obtaining ACCESS_TOKEN (e.g. via gcloud or a small script using the service account JSON)
curl -sS -X POST "https://fcm.googleapis.com/v1/projects/steps-cfc27/messages:send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -d '{
    "message": {
      "token": "DEVICE_FCM_TOKEN",
      "notification": { "title": "Test", "body": "FCM test from curl" }
    }
  }'
```

Replace `steps-cfc27` with your Firebase project ID and `DEVICE_FCM_TOKEN` with the token from the app. Success indicates FCM can deliver to that token.

---

## 3. Pre-APK build summary

1. **Config**: `google-services.json` in place, package `com.minaezzat.onesteps`, manifest has POST_NOTIFICATIONS and FCM notification icon/color, Gradle applies google-services.
2. **Stream**: Run `./test-stream-chat-push-config.sh`; ensure **Android (FCM)** section shows enabled and valid.
3. **Delivery**: Use **Firebase Console → Send test message** with the device FCM token (from app log) to confirm delivery on a real device.

Then build the APK:

```bash
npm run build:apk
```

Install: `adb install android/app/build/outputs/apk/release/app-release.apk` or copy the APK to the device and install.
