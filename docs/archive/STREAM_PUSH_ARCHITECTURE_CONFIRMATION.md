# Stream Chat + Expo (EAS) + Push — Architecture Confirmation

This doc confirms how the OneCrew app aligns with the “it actually works” setup (Stream’s built-in push, not Expo’s push service) and what is **not** implemented or should be verified.

---

## Summary

| Step | Description | Status |
|------|-------------|--------|
| 1 | Firebase (Android + iOS) | ✅ Implemented (one Expo gap, see below) |
| 2 | Stream push provider (Dashboard) | ⚠️ Verify in Dashboard |
| 3 | Expo/EAS app setup | ✅ Mostly; **Expo config gap** |
| 4 | Backend (Stream token) | ✅ Implemented (OneCrewBE) |
| 5 | Frontend: connect + register device | ✅ Implemented (+ iOS APNs, token refresh) |
| 6 | “Why no pushes?” checklist | ✅ Addressed in code and docs |

---

## Step 1 — Firebase (Android + iOS)

| Requirement | Status | Notes |
|-------------|--------|--------|
| Firebase project | ✅ | `steps-cfc27` |
| Android app (package) | ✅ | `com.minaezzat.onesteps` |
| iOS app (bundle id) | ✅ | `com.minaezzat.onesteps` |
| `google-services.json` (Android) | ✅ | In `android/app/google-services.json` |
| `GoogleService-Info.plist` (iOS) | ✅ | In `ios/Steps/GoogleService-Info.plist` |
| APNs Auth Key (.p8) in Firebase | ✅ | Production APNs auth key uploaded (Cloud Messaging → Apple app configuration) |

**Conclusion:** Step 1 is implemented. Firebase can deliver to both Android (FCM) and iOS (via APNs key).

---

## Step 2 — Stream push provider (one-time)

| Requirement | Status | Notes |
|-------------|--------|--------|
| Stream Dashboard → Enable Firebase | ⚠️ Verify | Run `./test-stream-chat-push-config.sh` (with `STREAM_API_SECRET`) and check “Android push (FCM / Firebase)” is enabled |
| Upload Firebase **service account JSON** to Stream | ⚠️ Verify | Stream needs this to send pushes. Dashboard → Chat → Push Notifications → Firebase credentials |

**Conclusion:** Cannot be confirmed from code. Verify in [Stream Dashboard](https://dashboard.getstream.io/) and with the script above.

---

## Step 3 — Expo / EAS app setup

| Requirement | Status | Notes |
|-------------|--------|--------|
| `stream-chat` / `stream-chat-react-native` | ✅ | In `package.json` |
| `@react-native-firebase/app` & `@react-native-firebase/messaging` | ✅ | In `package.json` |
| Not using Expo Go for push | ✅ | EAS Build / dev client (`expo-dev-client` in package.json) |
| **Expo `plugins`** | ❌ **Not in app.json** | Guide recommends: `"@react-native-firebase/app"`, `"@react-native-firebase/messaging"` in `app.json` → `expo.plugins` |
| **Expo `googleServicesFile`** | ❌ **Not in app.json** | Guide recommends: `ios.googleServicesFile`, `android.googleServicesFile` pointing to Firebase config files |

**What you have instead:** Native projects already contain `google-services.json` and `GoogleService-Info.plist`. So push works with current EAS/native setup. Adding the plugins and `googleServicesFile` in `app.json` would align with the documented structure and ensure correct config on future `expo prebuild` / new native projects.

**Conclusion:** Step 3 is functionally implemented (Firebase files in native dirs). For strict alignment with the guide, add Firebase plugins and `googleServicesFile` to `app.json`.

---

## Step 4 — Backend (Stream token only)

| Requirement | Status | Notes |
|-------------|--------|--------|
| Backend returns Stream user token | ✅ | OneCrewBE exposes token endpoint; app uses `getStreamChatToken()` → `${baseUrl}/api/chat/token` (with `profile_type` / `company_id` for profile switching) |
| Backend creates/upserts user and returns `apiKey` + `token` | ✅ | App expects `{ token, user_id, api_key }` and uses them in `StreamChatProvider` |

Backend repo: [m7mdrf3t/OneCrewBE](https://github.com/m7mdrf3t/OneCrewBE).

**Conclusion:** Step 4 is implemented; backend provides Stream tokens and app uses them correctly.

---

## Step 5 — Frontend: connect user + register device for push

| Requirement | Status | Notes |
|-------------|--------|--------|
| Get Stream token from backend | ✅ | `getStreamChatToken()` in ApiContext → `/api/chat/token` |
| Connect Stream user | ✅ | `streamChatService.connectUser(...)` in StreamChatProvider |
| Request push permission | ✅ | `pushNotificationService.requestPermissions()` (iOS: Firebase auth status; Android: POST_NOTIFICATIONS on 13+) |
| Get FCM token | ✅ | `messaging().getToken()` via PushNotificationService |
| **Android:** `client.addDevice(fcmToken, "firebase")` | ✅ | `StreamChatService.registerDeviceForPush(deviceToken)` with `pushProvider: 'firebase'` on Android |
| **iOS:** `client.addDevice(apnsToken, "apn")` | ✅ | App uses `getAPNSToken()` and registers APNs token with Stream (not FCM token on iOS) |
| **Token refresh:** re-register with Stream | ✅ | `onTokenRefresh` → `registerPushToken(newToken)` → backend + `streamChatService.registerDeviceForPush(streamToken)` when connected |

**Conclusion:** Step 5 is fully implemented, including iOS vs Android token types and token refresh re-registration with Stream.

---

## Step 6 — “Why am I not receiving pushes?” checklist

| Check | Addressed in app / project |
|-------|----------------------------|
| Not testing in Expo Go | ✅ Using EAS build / dev client |
| Firebase service account JSON in Stream | ⚠️ Verify in Stream Dashboard |
| iOS: APNs key in Firebase | ✅ Production APNs auth key uploaded |
| User “online” (Stream only pushes when no active connection) | ✅ Handled by Stream / SDK; app backgrounds and disconnects as expected |
| Device registered with Stream (`addDevice`) | ✅ On connect and on token refresh via `registerDeviceForPush` |

---

## What is NOT implemented (or to verify)

1. **Stream Dashboard — Firebase credentials**  
   Ensure Firebase **service account JSON** is uploaded in Stream Dashboard (Push Notifications → Firebase). Without this, Stream cannot send FCM/APNs pushes.

2. **Expo `app.json` (optional but recommended)**  
   - Add to `expo.plugins`: `"@react-native-firebase/app"`, `"@react-native-firebase/messaging"`.  
   - Add `expo.ios.googleServicesFile` and `expo.android.googleServicesFile` pointing to your Firebase config files (e.g. `./android/app/google-services.json` and `./ios/Steps/GoogleService-Info.plist` or a shared `./firebase/` path).  
   This matches the documented structure and keeps Firebase config consistent across prebuilds.

3. **Deep link on notification tap**  
   Optional: open a specific chat screen when the user taps a push (Stream supports push templates with channel/message IDs). Not required for “push received”; only for navigation.

---

## One-line summary

You are using the same architecture: **Expo (EAS) + Stream Chat + @react-native-firebase/messaging**, with **backend (OneCrewBE) issuing Stream tokens** and **Stream Dashboard configured for Firebase push**. Implemented: Firebase (Android + iOS, including APNs key), backend token endpoint, connect user, FCM/APNs token retrieval, `addDevice` for both platforms (APNs on iOS, FCM on Android), and token refresh re-registration with Stream. To confirm end-to-end: verify **Stream Dashboard** has Firebase (service account) push enabled; optionally add **Firebase plugins and googleServicesFile** to `app.json` for the exact documented setup.
