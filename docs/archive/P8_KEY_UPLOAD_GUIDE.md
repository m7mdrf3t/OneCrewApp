# Uploading the .p8 Key for iOS Push (APNs)

One **APNs Authentication Key** (.p8) from Apple is used in **two places**: Firebase (for FCM → iOS) and Stream Chat (for chat push). You create the key once in Apple Developer, then upload it to both.

**App bundle ID:** `com.minaezzat.onesteps`

---

## Part 1: Create and download the .p8 key (Apple)

You only need to do this **once** (or when you revoke/rotate the key).

1. Go to [Apple Developer Portal](https://developer.apple.com/account/) and sign in.
2. Open **Certificates, Identifiers & Profiles** → **Keys**  
   Direct link: [Keys](https://developer.apple.com/account/resources/authkeys/list)
3. Click the **+** button to create a new key.
4. **Name:** e.g. `OneCrew APNs` or `Steps Push`.
5. Enable **Apple Push Notifications service (APNs)** (leave other boxes unchecked unless you need them).
6. Click **Continue** → **Register**.
7. **Download the .p8 file**  
   - You can download it **only once**. Store it securely (e.g. password manager or secure backup).
8. **Note these (you’ll need them in both Firebase and Stream):**
   - **Key ID** – shown on the key detail page (e.g. `BY3M55Q9N8`).
   - **Team ID** – top right of the Apple Developer site, or in **Membership** (e.g. `9MK2V33M87`).
   - **Bundle ID** – your app’s: `com.minaezzat.onesteps`.

---

## Part 2: Upload .p8 to Firebase (for FCM → iOS)

Required so Firebase can deliver push to iOS devices.

1. Go to [Firebase Console](https://console.firebase.google.com/) and select your project.
2. Click the **gear** next to “Project Overview” → **Project settings**.
3. Open the **Cloud Messaging** tab.
4. Scroll to **Apple app configuration** (or “APNs Authentication Key”).
5. Click **Upload** (or “Add key”).
6. **Upload** your `.p8` file.
7. Enter:
   - **Key ID** (from Part 1).
   - **Team ID** (from Part 1).
   - **Bundle ID:** `com.minaezzat.onesteps` (must match the app).
8. Save/Upload.

Firebase will use this key to send FCM messages to iOS via APNs.

---

## Part 3: Upload .p8 to Stream Chat (for chat push)

Required so Stream can send chat message notifications to iOS.

1. Go to [Stream Chat Dashboard](https://dashboard.getstream.io/).
2. Select your app (e.g. API Key: `j8yy2mzarh3n`).
3. Go to **Settings** (or **Chat** overview) → **Push Notifications**.
4. Enable **Push Notifications** if not already.
5. Open the **iOS** section.
6. **Upload** the same `.p8` file.
7. Enter:
   - **Key ID** (same as Part 1).
   - **Team ID** (same as Part 1).
   - **Bundle ID** (if asked): `com.minaezzat.onesteps`.
8. **Save**.

Stream will use this key so chat messages can trigger push on iOS when the app is in background or closed.

---

## Checklist

| Step | Where | What |
|------|--------|------|
| 1 | Apple Developer → Keys | Create key, enable APNs, download .p8, note Key ID + Team ID |
| 2 | Firebase Console → Project Settings → Cloud Messaging | Upload .p8, Key ID, Team ID (and Bundle ID if required) |
| 3 | Stream Chat Dashboard → Push Notifications → iOS | Upload .p8, Key ID, Team ID (and Bundle ID if required) |

**Bundle ID** must be **exactly** `com.minaezzat.onesteps` everywhere (Xcode, Firebase iOS app, Stream iOS config).

---

## Verify (optional)

After uploading to Stream, you can confirm the config with:

```bash
export STREAM_API_SECRET='your_stream_api_secret'
./test-stream-chat-push-config.sh
```

You should see HTTP 200 and an `apn` (or `apn_auth`) entry with your Key ID, Team ID, and bundle ID.

---

## Important notes

- **One key, two places:** The same .p8 key is uploaded to both Firebase and Stream. You do **not** need two different keys.
- **.p8 is secret:** Don’t commit it to git or share it. If it’s exposed, revoke the key in Apple Developer, create a new one, and re-upload to Firebase and Stream.
- **Download once:** Apple lets you download the .p8 only once. If you lose it, create a new key and upload the new .p8 to Firebase and Stream.
- **TestFlight / production:** The same key works for both development and production APNs; no need for a separate .p8 for TestFlight.
