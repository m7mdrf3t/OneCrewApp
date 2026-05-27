# FCM Push Notification Flow

End-to-end flow for Firebase Cloud Messaging (FCM) in the app: where things run, what gets logged, and where to look (client vs backend).

---

## 1. Overview (high level)

```
[Device]  →  Request permission  →  Get FCM token  →  Register with Backend + Stream
[Backend] →  Stores token (e.g. POST /api/users/:id/push-token)
[Stream]  →  Stores device for push (client.addDevice)
[FCM]     →  Sends push to device when backend/Stream sends a message
[Device]  →  Receives push (foreground / background / quit)  →  Optional: tap → open app / navigate
```

---

## 2. App startup & Firebase

| Step | Where | What happens |
|------|--------|----------------|
| 1 | `FirebaseInitService` | Firebase is initialized from `GoogleService-Info.plist` (iOS) or `google-services.json` (Android). |
| 2 | `index.ts` | After 3s delay, background message handler is registered (`setBackgroundMessageHandler`) so FCM can run when app is in background. |
| 3 | `App.tsx` | After 2s delay, `pushNotificationService.initialize()` is called. |

**Logs (client):** `✅ [Firebase] Already initialized (native config)`, `✅ [BackgroundHandler] Firebase background message handler registered successfully`

---

## 3. Token acquisition (device)

All in **`PushNotificationService`** (`src/services/PushNotificationService.ts`).

| Step | Method | What happens |
|------|--------|----------------|
| 1 | `registerForPushNotifications()` | Checks physical device, calls `ensureFirebaseInitialized()`. |
| 2 | `requestPermissions()` | Asks OS for notification permission (iOS/Android). |
| 3 | `getStoredToken()` | If we already have a token in AsyncStorage, return it. |
| 4 | `getMessaging()` | Gets Firebase messaging instance (can be null if native not ready). |
| 5 | iOS only | `messaging().registerDeviceForRemoteMessages()` for APNs. |
| 6 | `messaging().getToken()` | Gets FCM token from Firebase. |
| 7 | Token stored | `AsyncStorage.setItem(NOTIFICATION_TOKEN_KEY, token)`, `onTokenRefresh` listener set. |

**Logs (client):**  
- Success: none in this file (success is when token is returned).  
- Failure: `⚠️ [Token] Push permission not granted`, `⚠️ [Token] Firebase messaging not ready`, `⚠️ [Token] getToken() returned null`, or `❌ [Token] Error registering...`

---

## 4. Token registration (backend + Stream)

Triggered from **`ApiContext`** when the user is authenticated (session restore or after login), with retries (e.g. 2.5s, 5s, 7.5s, 10s).

| Step | Where | What happens |
|------|--------|----------------|
| 1 | `ApiContext.registerPushToken(token)` | Called with the FCM token from step 3. |
| 2 | Backend | `api.pushNotifications.registerDeviceToken(token, platform, deviceId, appVersion)` → typically **POST /api/users/:userId/push-token** (or equivalent in your API client). |
| 3 | Stream Chat | If Stream is connected: **iOS** uses APNs token (`getAPNSToken()`) with `client.addDevice(apnsToken, 'apn')`; **Android** uses FCM token with `client.addDevice(token, 'firebase')`. Stream expects APNs device token for iOS, not the FCM token. |

**Logs (client):**  
- `📱 [Backend] Registering FCM token with backend using API client...`  
- `🔑 [FCM] Full token (copy for Firebase Console → Send test message): <token>`  
- `✅ [Backend] Push token registered successfully via API client`  
- `✅ [StreamChat] Device registered for push notifications with Stream`

**Logs (backend / Google Cloud):**  
- Whatever your backend logs when it receives the push-token request (e.g. “FCM token registered for user X”). Check **Cloud Run logs** (Logging → Logs Explorer, filter by your service).

---

## 5. Sending a push (who sends what)

| Sender | How | FCM role |
|--------|-----|----------|
| **Your backend** | Uses stored FCM token and Firebase Admin SDK (or FCM HTTP v1 API) to send to that token. | FCM delivers to device. |
| **Stream Chat** | When a new message is sent, Stream’s servers send push using the device registered via `addDevice`. | FCM delivers to device (APNs on iOS). |

So the “FCM flow” on the server is: **your backend or Stream calls FCM with the token → FCM (and APNs on iOS) delivers to the device.**

---

## 6. Receiving a push (device)

Three cases: **foreground**, **background**, **app not running (quit)**.

### A. App in foreground

| Step | Where | What happens |
|------|--------|----------------|
| 1 | FCM | Delivers message to the app. |
| 2 | `PushNotificationService.addNotificationReceivedListener` | Uses `messaging().onMessage()`. |
| 3 | `App.tsx` | Subscribes to that listener; you can handle payload or rely on Firebase/OS to show. |

**Logs (client):** Optional `📨 [App] Notification received in foreground:` if you log in the listener.

### B. App in background

| Step | Where | What happens |
|------|--------|----------------|
| 1 | FCM | Delivers message; OS may show notification. |
| 2 | `index.ts` | Handler registered with `setBackgroundMessageHandler` runs (must be top-level). |
| 3 | Optional | You can process `remoteMessage.data`; notification display is usually handled by OS. |

**Logs (client):** `📨 [BackgroundHandler] Message handled in background:`, `Title:`, `Body:`, `Data:` (in device logs; not in Metro when app is backgrounded).

### C. App quit (not running)

| Step | Where | What happens |
|------|--------|----------------|
| 1 | FCM/APNs | Delivers message; OS shows notification. |
| 2 | User taps notification | OS starts the app. |
| 3 | `App.tsx` | On launch, `pushNotificationService.getInitialNotification()` is called. |
| 4 | `handleNotificationNavigation(data)` | Uses `data` (e.g. `type`, `conversation_id`, `project_id`) to navigate. |

**Logs (client):** `📱 [App] App opened from notification:`, `📱 [App] Initial notification data:`, `📱 [App] Navigating based on notification data...`

---

## 7. Notification tap (app was in background)

| Step | Where | What happens |
|------|--------|----------------|
| 1 | User taps notification | App comes to foreground. |
| 2 | `App.tsx` | `messaging().onNotificationOpenedApp()` fires. |
| 3 | `handleNotificationNavigation(remoteMessage.data)` | Same routing as quit case (e.g. open chat, project, invitations). |

**Logs (client):** `👆 [App] Notification tapped (app in background):`, `👆 [App] Notification data:`

---

## 8. Navigation from notification data

**`App.tsx` → `handleNotificationNavigation(data)`** routes using `data` from the FCM payload:

| `data.type` or field | Action |
|----------------------|--------|
| `company_invitation` | Open invitation list modal. |
| `project_created`, `project_member_added` | Navigate to project detail (`data.project_id`). |
| `task_assigned`, `task_completed` | Navigate to project detail (`data.project_id`). |
| `message_received` | Navigate to chat (`data.conversation_id`). |
| `link_url` | Custom link (e.g. open URL). |

Backend or Stream must send these fields in the FCM **data** payload for deep linking to work.

---

## 9. Where to see logs

| Want to see | Where |
|-------------|--------|
| **Client (token, registration, foreground/tap)** | Metro logs (dev build) or Xcode/Console.app (TestFlight/dev device). |
| **Client (background handler)** | Only on device (no Metro when backgrounded): Xcode → Window → Devices and Simulators → Console, or Console.app. |
| **Backend (token received, send push)** | **Google Cloud Logging**: Console → Logging → Logs Explorer, resource type **Cloud Run Revision**, select your service. Filter by `textPayload` or `jsonPayload` (e.g. “push”, “FCM”, “token”). |
| **FCM delivery** | Firebase Console → Engage → Messaging (campaign stats). For “did the device get it?” use a test send to one FCM token. |

---

## 10. Quick checklist (FCM flow)

- [ ] Firebase initialized (client log).
- [ ] Background handler registered (client log).
- [ ] Permission granted; FCM token obtained (no `⚠️ [Token]` / `❌ [Token]`).
- [ ] Token sent to backend (client log + backend Cloud Run log).
- [ ] Token registered with Stream if using chat push (client log).
- [ ] Test send from Firebase Console to token → notification on device (background/quit).
- [ ] Tap notification → app opens and navigates (e.g. chat for `message_received` + `conversation_id`).

Use this as the single place to “see” the whole FCM flow and where to monitor it (client vs Google Cloud server logs).
