# Stream Push Notifications Doc vs Our Implementation

How the app aligns with the [Stream React Native Push Notifications](https://getstream.io/chat/docs/sdk/react-native/push-notifications/) guide and where we differ (by choice or optional).

---

## Best practices (doc)

| Doc recommendation | Our implementation |
|--------------------|--------------------|
| Users are channel members before expecting pushes | ✅ Backend creates/joins channel; app registers device after `connectUser`. |
| Register and refresh device tokens after `connectUser` | ✅ We register in `StreamChatProvider` and `ApiContext` after connect; `onTokenRefresh` triggers re-register with backend and Stream. |
| Store and rotate push tokens to avoid duplicates/stale | ⚠️ We store token and re-register on refresh but **do not** call `client.removeDevice(oldToken)` before adding the new one. Optional improvement: remove old device on refresh. |
| Test foreground, background, killed on both platforms | ✅ Documented in our test guides; flow supports all states. |
| Keep push payload templates aligned with navigation | ✅ We handle both `message.new` + `channel_id`/`cid` (Stream default) and `message_received` + `conversation_id` in `handleNotificationNavigation`. |

---

## Prerequisites & Firebase setup

| Doc item | Our implementation |
|----------|--------------------|
| Push requires membership | ✅ Handled by backend/Stream. |
| Firebase project, Android + iOS apps, APNs key in Firebase | ✅ Done (steps-cfc27, APNs auth key uploaded). |
| Install `@react-native-firebase/app` and `@react-native-firebase/messaging` | ✅ In package.json. |
| Android credentials, iOS credentials, Push Notifications capability | ✅ google-services.json, GoogleService-Info.plist, capability. |
| Expo: not Expo Go; use expo-dev-client | ✅ We use EAS build / dev client. |
| Service account JSON → Stream Dashboard | ✅ Uploaded (e.g. KawalesFCMAndroid). |

---

## Registering a device with Stream

| Doc pattern | Our implementation |
|-------------|--------------------|
| `client.addDevice(token, push_provider)` after `connectUser` | ✅ We call `streamChatService.registerDeviceForPush(streamToken)` after connect; iOS uses APNs token, Android uses FCM token with `pushProvider: 'firebase'`. |
| Doc example: `client.addDevice(token, push_provider, USER_ID, push_provider_name)` | We use the 2-arg form `addDevice(deviceToken, pushProvider)`. Stream infers user from the connected client; optional 3rd/4th args are for multi-provider naming. |
| `onTokenRefresh` → remove old token, then `addDevice(newToken)` | We re-register the new token with backend and Stream but **do not** call `removeDevice(oldToken)`. Optional: store current token and call `removeDevice(old)` on refresh. |

---

## Payload and receiving notifications

| Doc item | Our implementation |
|----------|--------------------|
| Payload has `data` (e.g. `type`, `channel_id`, `cid`) and optionally `notification` (title, body) | ✅ We handle `data.type === 'message.new'` and `channel_id`/`cid` in App.tsx; Firebase/OS shows notification when template includes `notification`. |
| iOS: notification field → Firebase shows when background/quit | ✅ We don’t use data-only iOS payload; default template shows notification. |
| Android: only `data` by default; optionally use `setBackgroundMessageHandler` + Notifee to display | We use `setBackgroundMessageHandler` in index.ts but **do not** display the notification ourselves (no Notifee). We rely on Stream’s push template including a **notification** block for Android (e.g. after v1→v2 migration or custom template), so the OS displays it. If your template is data-only on Android, you’d need Notifee (or add `notification_template` in Dashboard) to show the notification. |

---

## Listen to user interactions (tap → open chat)

| Doc item | Our implementation |
|----------|--------------------|
| iOS: `getInitialNotification` (quit) + `onNotificationOpenedApp` (background) | ✅ We use both in App.tsx and call `handleNotificationNavigation(data)`. |
| Android: doc suggests Notifee `getInitialNotification` and `onBackgroundEvent` | We use **Firebase** `getInitialNotification()` and `onNotificationOpenedApp()` for both platforms. When the notification is shown by the OS from FCM (template with `notification`), the tap opens the app and FCM delivers the same payload to these handlers, so we get `channel_id`/`cid` and navigate to chat. We do **not** use Notifee. |
| Navigate to channel screen with `channel_id` | ✅ We derive `conversationId` from `data.channel_id` or `data.cid` and call `navigateTo('chat', { conversationId })`. |

---

## Customizing payload (doc)

| Doc item | Our implementation |
|----------|--------------------|
| Add `notification_template` for Android (title, body, sound, click_action) | Optional. If you add it in Stream Dashboard, Android gets a visible notification with sound and tap opens the app; we don’t need Notifee for display. |
| `apn_template` with badge, alert, etc. | Optional; we use default behavior. |
| Data-only iOS / Notifee display | We don’t use this path. |

---

## Summary

- **Aligned:** Firebase setup, device registration after `connectUser`, token refresh re-registration, payload handling (`message.new` + `channel_id`/`cid`), tap handling via Firebase `getInitialNotification` and `onNotificationOpenedApp`, navigation to chat with `conversationId`.
- **Optional improvements:**  
  - Call `client.removeDevice(oldToken)` before `addDevice(newToken)` on token refresh to avoid duplicate devices.  
  - If Android doesn’t show notifications, add `notification_template` in Stream Dashboard (or use Notifee in `setBackgroundMessageHandler` to display from `data`).  
- **Not used:** Notifee (we rely on FCM/Stream to show the notification and Firebase APIs for tap handling).
