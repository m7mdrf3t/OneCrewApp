# Android: Local APK Build and Chat Push Test

Build a local APK (1.3.10, build 28) and verify new chat messages trigger push notifications on a physical Android device.

---

## 1. Build the APK

From the project root:

```bash
npm run build:apk
```

Or directly:

```bash
cd android && ./gradlew assembleRelease && cd ..
```

- **Output:** `android/app/build/outputs/apk/release/app-release.apk`
- The release build uses the debug keystore (so you can install without a production keystore). For Play Store you’d switch to a release signing config.

Install on a connected device:

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

Or copy `app-release.apk` to the phone and open it (allow “Install from unknown sources” if prompted).

---

## 2. Ensure Chat Uses Push on Android

The app is already set up so **new messages in chat use push** on Android:

- **FCM token** is obtained and sent to your backend and to **Stream Chat** (`registerDeviceForPush` with provider `firebase`).
- Stream Chat sends push via FCM when a new message is received and the app is in background or closed.
- **Background handler** is registered in `index.ts` so FCM messages are handled when the app is not in foreground; the OS shows the notification when the payload includes title/body.

No extra code is required for “new messages use push” on Android; just ensure:

1. **Notification permission** is granted (Android 13+: the app will prompt; older: granted by default).
2. **Stream Chat** has your Android app’s FCM credentials configured in the Stream Dashboard (FCM server key or FCM v1 service account).
3. User has opened the app at least once while logged in so the FCM token is registered with Stream.

---

## 3. Quick Push Test (Two Devices or Two Accounts)

1. **Device A (your APK):** Log in, allow notifications, then **background the app** or **force‑close** it.
2. **Device B (or another account):** Log in, open a chat with the user on Device A, and **send a message**.
3. **Device A:** A **push notification** should appear. Tapping it should open the app (and ideally the correct chat).

If you only have one device, use the **Stream Chat Dashboard** to send a test message to a channel that the APK user is in and check for the push on the device.

---

## 4. Optional: FCM Test from Firebase Console

To confirm FCM delivery independently of Stream:

1. Run the app on the device and check logs for: `🔑 [FCM] Full token (copy for Firebase Console...)`.
2. Copy that token.
3. In **Firebase Console → Engage → Messaging → New campaign → Firebase Notification messages → “Send test message”**, paste the token and send.
4. With the app in background or closed, the device should receive the test notification.

---

## 5. Troubleshooting

| Issue | Check |
|-------|--------|
| No push when message sent | Notification permission ON; app opened at least once while logged in; Stream Dashboard has FCM configured for Android. |
| Build fails | Run `cd android && ./gradlew clean && ./gradlew assembleRelease`. Ensure `google-services.json` is in `android/app/`. |
| Install fails (signature) | Uninstall the existing app on the device and install the new APK (same package, different key). |
