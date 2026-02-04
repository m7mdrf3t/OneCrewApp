# TestFlight: What to Monitor for Push (Real Devices)

On TestFlight you don’t have Metro logs. Use this checklist to verify push notifications and core flows on real devices.

---

## 1. Before Testing (one-time per device)

- [ ] **Notifications allowed**  
  When the app first asks, tap **Allow**.  
  If you already chose Don’t Allow: **Settings → Steps (or your app name) → Notifications** → turn **Allow Notifications** on.
- [ ] **App opened at least once while logged in**  
  So the device can register for FCM and Stream Chat push.
- [ ] **Stable internet**  
  Wi‑Fi or cellular; push needs network to register and receive.

---

## 2. Push: What to Monitor (observable only)

### A. FCM test (Firebase Console)

1. Get an FCM token from a **dev build** (Metro log: `🔑 [FCM] Full token...`) or from your backend if you store it.
2. Firebase Console → **Engage** → **Messaging** → **New campaign** → **Firebase Notification messages** → **Test on device** → paste token → send.
3. On the **TestFlight app** (same Apple ID / account that received the token):
   - [ ] **App in background**: notification appears in Notification Center.
   - [ ] **App fully closed**: notification appears; **tap** → app opens.
   - [ ] **App in foreground**: notification may show in-app or as banner (depends on your handler).

### B. Stream Chat push (real usage)

Use two devices or two accounts (e.g. TestFlight on Device A, simulator or another device for Device B).

1. **Device A (TestFlight)**: Log in as **User 1**. Put app in **background** or **force‑close**.
2. **Device B**: Log in as **User 2**. Open a chat with User 1 and **send a message**.
3. On **Device A** check:
   - [ ] A **push notification** appears (title/body or “New message” style).
   - [ ] **Tapping the notification** opens the app and, ideally, the correct chat/conversation.

If you only have one device, use **Stream Chat Dashboard** to send a test message to the channel the TestFlight user is in and check the same two items above.

---

## 3. Quick checklist (per TestFlight build)

| What to monitor | How to check |
|-----------------|--------------|
| **Notification permission** | Settings → [App] → Notifications → ON. |
| **FCM delivery** | Send test from Firebase Console to device token → notification received when app in background/closed. |
| **Stream Chat push** | Message from another user/dashboard → push on TestFlight device when app in background/closed. |
| **Tap opens app** | Tap notification → app opens (and navigates to chat if applicable). |
| **No crash on launch** | Open app from home screen → stays open, no immediate crash. |
| **Login / session** | Sign in → main screen loads; after background/close, open again → still logged in (if you expect that). |

---

## 4. 1-minute E2E push checklist (real device)

If chat push still doesn’t arrive, it’s usually one of these (not code):

| Check | What to do |
|-------|------------|
| **App state** | Recipient must have app **backgrounded or closed**. Push is not sent when they’re in the chat. |
| **Notification permission** | Settings → [App] → Notifications → **Allow Notifications** ON. |
| **APNs environment** | TestFlight/App Store build uses **production**. Dev/debug uses **development**. Stream Dashboard APNs config must match. |
| **Muted** | User or channel not muted; recipient is a member of the channel. |
| **Device in Stream** | Stream Dashboard → **Users** → select user → **Devices**: device should appear after opening app once while logged in. |

**Prove APNs registration in logs (Xcode / Console.app):**  
Search for: `iOS APNs token registered` — if you see it, the app successfully registered the APNs token with Stream.

---

## 5. Optional: Device logs (no Metro)

If you need to debug on device:

1. Connect the iPhone to your Mac.
2. **Xcode** → **Window** → **Organizer** (or **Devices and Simulators**) → select the device → **Open Console** (or use **Console.app** and filter by your app / process name).
3. Reproduce the flow (e.g. send push, tap notification) and look for your app’s logs or crashes.

Logs may be noisy; filter by your app name or bundle ID.

---

## 6. If push doesn’t appear on TestFlight

- Confirm **notification permission** is ON for the app.
- Confirm **APNs key** is uploaded in **Firebase** (Project Settings → Cloud Messaging → Apple app) and in **Stream Chat** (Push Notifications → iOS).
- Test with **app in background or closed** (push is often not shown when app is in foreground, depending on implementation).
- Ensure the TestFlight build includes the **Stream iOS fix**: the app now registers the **APNs device token** with Stream (not the FCM token). Build from after this fix (see STREAM_CHAT_NOTIFICATIONS_SETUP.md).
- Try **reinstalling** the TestFlight build and accepting notifications again, then repeat one FCM test and one Stream Chat test.

Use this doc as your “what to monitor” list while testing the TestFlight version on real devices.
