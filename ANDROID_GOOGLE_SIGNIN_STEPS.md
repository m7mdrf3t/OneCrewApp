# Android Google Sign-In – Step-by-step fix

Follow these steps in order to fix “Sign in with Google” on Android (emulator, device, or Play Store).

---

## Why it works on iOS but not Android

| Platform | How Google identifies your app | What you configure in Google Cloud |
|----------|--------------------------------|-------------------------------------|
| **iOS** | **Bundle ID** only (e.g. `com.minaezzat.onesteps`). No certificate fingerprint. | Create an **iOS** OAuth client with that bundle ID. You do **not** upload any key or .jks for iOS. |
| **Android** | **Package name + SHA-1** of the certificate that signed the APK. | Create an **Android** OAuth client with package name and **SHA-1 fingerprint** (you paste the SHA-1 string; you do **not** upload a .jks file to Google Cloud for Sign-In). |

**.jks (Java KeyStore)** is an **Android** signing format. iOS uses Apple’s code signing (certificates, provisioning profiles), not .jks. For **Google Sign-In**, you never upload a .jks file to Google Cloud—you only register the **SHA-1** (and package name) when creating the **Android** OAuth client. So the reason Sign-In works on iOS and fails on Android is that Android requires the **correct SHA-1** to be registered in the same project as your Web client; if it’s missing or wrong, you get DEVELOPER_ERROR. iOS doesn’t use SHA-1 for this, so it can work with just the bundle ID.

---

## Step 1: Confirm which build you’re testing

| Build type | Where you get SHA-1 |
|------------|---------------------|
| **Emulator / `npx expo run:android`** | Project debug keystore (Step 2 below) |
| **App from Play Store** | Play Console → App integrity → **App signing key** SHA-1 (Step 3 below) |

You can add **both** SHA-1s to Google Cloud (two Android OAuth clients, same package) so dev and store builds both work.

---

## Step 2: Get SHA-1 for debug/emulator (if needed)

This app signs debug builds with **`android/app/debug.keystore`** (not `~/.android/debug.keystore`).

**Option A – Use this value (current project keystore):**

```
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

**Option B – Generate it yourself (from project root):**

```bash
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Copy the **SHA1:** line (colons included). It should match the value in Option A if you haven’t replaced the keystore.

---

## Step 3: Get SHA-1 for Play Store (if testing store build)

1. Open [Google Play Console](https://play.google.com/console/) → your app **Steps**.
2. Go to **Setup** → **App integrity** (or **Release** → **Setup** → **App signing**).
3. Under **App signing key certificate**, copy the **SHA-1 certificate fingerprint**.
4. Do **not** use the “Upload key” SHA-1; use the **App signing key** (the one Google uses to sign the app for users).

---

## Step 4: Open the correct Google Cloud project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Click the **project dropdown** at the top.
3. Select the project whose **project number** is **309236356616**.
   - In the list it may show as **steps-479623** (project ID) or with a name like “OneCrew” / backend.
4. **Check you’re in the right project:** go to **APIs & Services** → **Credentials**. You must see a **Web client** (OAuth 2.0 Client ID, type “Web application”) with Client ID:
   ```
   309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj.apps.googleusercontent.com
   ```
   If you don’t see that Web client, you’re in the wrong project (e.g. steps-cfc27). Switch to the project that has that Web client.

---

## Step 5: Create the Android OAuth client (debug)

1. In the same project (steps-479623), go to **APIs & Services** → **Credentials**.
2. Click **+ Create credentials** → **OAuth client ID**.
3. **Application type:** **Android**.
4. **Name:** e.g. `Steps Android (debug)`.
5. **Package name:** type exactly:
   ```
   com.minaezzat.onesteps
   ```
   (no spaces, no `.debug` or other suffix)
6. **SHA-1 certificate fingerprint:** paste:
   ```
   5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
   ```
7. Click **Create**.

If you see “Package name and fingerprint already in use”, that combination is already registered. Skip to Step 7 and verify; no need to create again.

---

## Step 6: Create the Android OAuth client (Play Store) – optional

Only if you need Sign-In to work for the **app installed from the Play Store**:

1. **APIs & Services** → **Credentials** → **+ Create credentials** → **OAuth client ID**.
2. **Application type:** **Android**.
3. **Name:** e.g. `Steps Android (Play Store)`.
4. **Package name:** `com.minaezzat.onesteps`
5. **SHA-1 certificate fingerprint:** the **App signing key** SHA-1 from Play Console (Step 3).
6. Click **Create**.

---

## Step 7: Verify in Credentials

In **APIs & Services** → **Credentials** you should have:

- At least one **Web client** with ID `309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj...`.
- One or two **Android** clients with package name `com.minaezzat.onesteps` and the correct SHA-1(s).

All of these must be in the **same** project (steps-479623 / 309236356616).

---

## Step 8: Wait and reinstall

1. **Wait 15–30 minutes** after creating or editing the Android client(s). Shorter waits can still fail.
2. On the device/emulator, **uninstall** the app:
   - Manually: long-press app → Uninstall, or  
   - From computer: `adb uninstall com.minaezzat.onesteps`
3. **Install again:**
   - Emulator/debug: `npx expo run:android`
   - Play Store: install from Play Store or internal testing.
4. Open the app and try **Sign in with Google** again.

---

## Step 9: Confirm it’s fixed

- Tap “Sign in with Google” and complete the Google flow.
- You should return to the app and be signed in (no DEVELOPER_ERROR).

---

## Still failing? Find where the issue is

If you created a new Android OAuth client with the “correct” App signing SHA and it still fails, work through these in order.

### 1. Are you testing the right build? (most common)

**Google matches the app by the certificate that actually signed the APK.**

| How you run the app | Certificate used | SHA-1 you must add in Google Cloud |
|---------------------|------------------|-------------------------------------|
| Emulator or `npx expo run:android` | **Debug** keystore (`android/app/debug.keystore`) | **Debug** SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` |
| App installed from Play Store | **App signing key** (Google’s key) | **App signing key** SHA-1 from Play Console → App integrity |

- If you **only** added the **App signing** SHA-1 and you’re testing on **emulator or a debug build**, that’s the issue: the running app is signed with the **debug** key, so you must also create an **Android** OAuth client with the **debug** SHA-1 above (same project, same package `com.minaezzat.onesteps`).
- If you’re testing the **Play Store** app, you must have an Android client with the **App signing key** SHA-1 (not the Upload key). Use Play Console → Setup → App integrity → **App signing key certificate** → SHA-1.

### 2. Is the Android client in the right project?

The Android OAuth client must be in the **same** Google Cloud project as the **Web** client.

- Open [Google Cloud Console](https://console.cloud.google.com/) and check the **project name/number** at the top.
- Go to **APIs & Services** → **Credentials**.
- You must see a **Web client** (OAuth 2.0 Client ID, type “Web application”) with ID starting with `309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj`.
- Your **Android** client(s) must be in **this same project** (usually **steps-479623**, number **309236356616**).
- If the Web client is in project A and you created the Android client in project B (e.g. **steps-cfc27** or another Firebase project), Sign-In will keep failing. Create the Android client in the **project that contains the Web client**.

### 3. Package name and SHA-1 exact?

- **Package name:** exactly `com.minaezzat.onesteps` (no space, no `.debug`, no typo).
- **SHA-1:** copy-paste with colons; no extra spaces or characters. For Play Store use the **App signing key** SHA-1, not the Upload key.

### 4. Wait and reinstall

- Wait **at least 15–30 minutes** after creating the Android client.
- **Uninstall** the app completely, then install again and try Sign in with Google.

### 5. Play Console: App signing key vs Upload key

In Play Console → Setup → App integrity you see two sections:

- **App signing key certificate** → use this **SHA-1** for the app users install from Play Store.
- **Upload key certificate** → do **not** use this for the Android OAuth client for Play Store installs.

---

---

## Still not working after 15+ minutes?

Do these in order.

### A. Confirm which SHA-1 the installed app actually uses

The device sends the **signing certificate** of the APK that is installed. If that doesn’t match what you added in Google Cloud, you get DEVELOPER_ERROR.

**If you’re testing on emulator or with `npx expo run:android`:**

- The app is signed with **`android/app/debug.keystore`**. Its SHA-1 must be in Google Cloud.
- From project root, print that keystore’s SHA-1 and compare to the Android client in Console:
  ```bash
  keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1
  ```
  It should be: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

**If you’re testing an APK from a build service (e.g. EAS):**

- That build may be signed with a **different** key (EAS default key or your upload key). The SHA-1 in Google Cloud must be from **that** key.
- Get the certificate from the APK you install:
  ```bash
  # From device (device/emulator connected)
  adb shell pm path com.minaezzat.onesteps
  adb pull $(adb shell pm path com.minaezzat.onesteps | tr -d '\r' | cut -d: -f2) /tmp/app.apk
  keytool -printcert -jarfile /tmp/app.apk | grep SHA1
  ```
  Add that exact SHA-1 as an Android OAuth client (same project, package `com.minaezzat.onesteps`).

### B. Add BOTH SHAs (debug + Play Store)

Create **two** Android OAuth clients in **steps-479623**, both with package `com.minaezzat.onesteps`:

1. One with **debug** SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
2. One with **App signing key** SHA-1 from Play Console → Setup → App integrity

Then whether you run from emulator or install from Play Store, one of them will match.

### C. Check the Android client in Google Cloud

- Open **APIs & Services** → **Credentials**.
- Click the **Android** client you created.
- **Package name** must be exactly: `com.minaezzat.onesteps` (no space, no suffix).
- **SHA-1** must match the fingerprint character-for-character (including colons, no leading/trailing space). If it was retyped, fix it or delete the client and create a new one with copy-paste.

### D. Delete and recreate the Android client

Sometimes a bad or cached config helps to clear:

1. In **steps-479623** → **Credentials**, delete the existing Android OAuth client(s) for `com.minaezzat.onesteps`.
2. Create a **new** Android OAuth client: type Android, package `com.minaezzat.onesteps`, SHA-1 copy-pasted from keytool or Play Console.
3. Wait 15–30 minutes, uninstall the app, reinstall, try again.

### E. Confirm project and Web client

- Project dropdown must show **steps-479623** (number 309236356616).
- On the same Credentials page you must see the **Web** client with ID `309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj...`. If the Web client is in another project, create the Android client in **that** project instead.

---

If it still fails after the above, see the full checklist in **ANDROID_GOOGLE_SIGNIN_DEVELOPER_ERROR.md**.

---

## Quick reference

| Item | Value |
|------|--------|
| Google Cloud project | **steps-479623** (number 309236356616) |
| Package name | `com.minaezzat.onesteps` |
| Debug SHA-1 | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` |
| Play Store SHA-1 | From Play Console → App integrity → App signing key |
| Web Client ID (already in app) | `309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj.apps.googleusercontent.com` |

No code or app config changes are required; the fix is only in Google Cloud Console.
