# Chat push: confirmation (notification + sound + tap to open)

This doc confirms behavior when the app is installed on **iOS** and **Android**: new chat messages trigger a **mobile notification with sound**, and **tapping the notification opens the correct chat** with the sender.

---

## 1. New message → notification with sound

| Layer | Behavior |
|-------|----------|
| **Stream** | When a new message is sent and the recipient has no active connection (app in background or closed), Stream sends a push via Firebase (Android) or APNs (iOS) using your Dashboard config. |
| **Firebase / APNs** | Delivers the payload. The **notification** block (title, body) is shown by the OS. |
| **Sound** | Stream’s default push template and FCM/APNs use the **default notification sound** unless you override it in the Stream push template. The app does not disable sound. On **Android**, the channel uses the default icon/color; sound is the system default unless you set a custom channel with a different sound. On **iOS**, the `aps` alert is displayed with default sound. |

**Conclusion:** New messages for any user should result in a **notification with (default) sound** on both platforms, as long as the device is registered with Stream, notifications are allowed, and the app is in background or closed.

---

## 2. Tap notification → open chat with sender

| Step | Implementation |
|------|----------------|
| **Tap (app closed)** | `getInitialNotification()` returns the message; `handleNotificationNavigation(data)` is called with `data` from the payload. |
| **Tap (app in background)** | `messaging().onNotificationOpenedApp()` runs; same `handleNotificationNavigation(data)`. |
| **Navigation** | `handleNotificationNavigation` now supports: (1) **`type === 'message_received'`** and **`conversation_id`** (backend-style payload), and (2) **`type === 'message.new'`** with **`channel_id`** or **`cid`** (Stream’s default payload). In both cases it calls `navigateTo('chat', { conversationId })`. |
| **ChatPage** | Receives `conversationId` from route params and uses it as the Stream channel id to open the correct conversation with the sender. |

**Conclusion:** Tapping the notification opens the **chat screen for that conversation** so the user can continue with the sender. This works for both your custom payload (`message_received` + `conversation_id`) and Stream’s default payload (`message.new` + `channel_id`/`cid`).

---

## 3. Code reference

- **Notification tap handling:** `App.tsx` — `getInitialNotification()`, `onNotificationOpenedApp()`, and `handleNotificationNavigation()`.
- **Chat open by conversation:** `handleNotificationNavigation` → `navigateTo('chat', { conversationId })` for `message_received` (with `conversation_id`) and `message.new` (with `channel_id` or `cid`).
- **Chat screen:** `ChatPage.tsx` uses `conversationId` from route params to load the Stream channel and show the conversation.

---

## 4. Quick test

1. **Device A:** Install app (iOS or Android), log in, allow notifications, then **background or close** the app.
2. **Device B:** Log in as another user, open a chat with the user on Device A, and **send a message**.
3. **Device A:** A **notification** should appear (with default sound). **Tap it** → app opens and shows the **chat with the sender**.

If you use a custom push template that sends `type: 'message_received'` and `conversation_id`, that path is supported. If you use Stream’s default payload (`message.new`, `channel_id`/`cid`), that path is also supported after the update in `App.tsx`.
