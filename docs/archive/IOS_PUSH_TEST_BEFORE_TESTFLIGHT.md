# Test iOS Push Notifications (FCM + Stream Chat) Before TestFlight

Use this guide to verify push notifications on a **physical iOS device** using FCM and Stream Chat before you create a TestFlight build.

---

## Prerequisites

### 1. Firebase (FCM)

- [ ] **GoogleService-Info.plist** in `ios/Steps/` and added to the Steps target in Xcode.
- [ ] **APNs key in Firebase**: Firebase Console → Project Settings → **Cloud Messaging** → **Apple app configuration** → Upload your `.p8` APNs key, Key ID, and Team ID.  
  Without this, FCM cannot deliver to iOS.

### 2. Stream Chat (for chat push)

- [ ] **Stream Chat Dashboard**: Push notifications enabled; **APNs** configured (upload `.p8`, Key ID, Team ID).  
  Same key as Firebase is fine.

### 3. Device

- [ ] **Physical iPhone** (push does not work on simulator).
- [ ] **Notification permission** granted when the app asks.

---

## Step 1: Run on a physical device

From project root:

```bash
npx expo run:ios --device
```

Pick your connected iPhone when prompted. Keep the **Metro terminal** open to see logs.

---

## Step 2: Confirm setup in logs

After the app launches and you’re **logged in**, check the Metro logs. You want to see:

| Check | Success log |
|-------|-------------|
| Firebase | `✅ [Firebase] Active project: steps-cfc27` (or your project name) |
| FCM token | `✅ [Backend] Push token registered successfully via API client` |
| Stream Chat push | `✅ [StreamChat] Device registered for push notifications with Stream` |
| Background handler | No `❌ [BackgroundHandler] Failed to set up background handler after all retries` |

If all four are good, FCM and Stream Chat push are in a good state for testing.

**If something fails:**

- **Token/Backend registration fails** → Fix Firebase init and `GoogleService-Info.plist`; ensure APNs key is in Firebase.
- **Stream Chat push fails** → Configure APNs in Stream Chat Dashboard (Push Notifications → iOS).

---

## Step 3: Test FCM (Firebase Console)

This checks that FCM can deliver to your device.

1. **Get your FCM token**  
   In Metro logs, find:
   ```text
   🔑 [FCM] Full token (copy for Firebase Console → Send test message): <long token>
   ```
   Copy the **entire** token.

2. **Send a test message**
   - Open [Firebase Console](https://console.firebase.google.com/) → your project.
   - Go to **Engage** → **Messaging** (or **Cloud Messaging**).
   - Click **Create your first campaign** or **New campaign** → **Firebase Notification messages**.
   - Enter title and body, click **Next** → **Next**.
   - Under **Test on device**, paste your FCM token and click **Test**.

3. **Verify**
   - **App in foreground**: in-app handling (e.g. log or in-app message).
   - **App in background or closed**: notification should appear in Notification Center. Tap it → app should open.

If you get the notification, FCM + APNs are working.

---

## Step 4: Test Stream Chat push

This checks that a new chat message triggers a push on the device.

1. **Two users**
   - **Device A**: Physical iPhone with the app in **background or closed** (recipient).
   - **Sender**: Simulator, another device, or Stream Chat Dashboard (sender).

2. **Send a message**
   - Log in as the sender and send a message in a channel where the recipient (Device A) is a member.
   - Or: Stream Chat Dashboard → **Chat** → **Channels** → select channel → **Send test message**.

3. **Verify**
   - Device A should get a push notification.
   - Tapping it should open the app (and ideally the right chat).

If this works, Stream Chat push is configured correctly.

---

## Quick checklist before TestFlight

- [ ] Run on physical iPhone: `npx expo run:ios --device`
- [ ] All four log checks pass (Firebase, Backend token, Stream Chat push, no background handler error)
- [ ] FCM test: copied token from `🔑 [FCM] Full token` and received test message from Firebase Console
- [ ] Stream Chat test: message sent to device in background → push received and tap opens app
- [ ] `ios/Steps/Steps.entitlements` has `aps-environment` (e.g. `production` for TestFlight)

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| No FCM token in logs | Firebase init; `GoogleService-Info.plist` in Xcode target; run on **physical device**. |
| Token present but no Firebase test notification | APNs key uploaded in Firebase (Project Settings → Cloud Messaging → Apple app). |
| Stream Chat push not received | APNs configured in Stream Chat Dashboard; device registered (open app once while logged in); recipient in channel. |
| “No Firebase App '[DEFAULT]'” | Add/fix `GoogleService-Info.plist` and rebuild. See `FIREBASE_NOTIFICATION_SETUP.md`. |

More detail: `PUSH_NOTIFICATION_TROUBLESHOOTING.md`, `STREAM_CHAT_NOTIFICATIONS_SETUP.md`, `IOS_RUN_AND_VERIFY.md`.
