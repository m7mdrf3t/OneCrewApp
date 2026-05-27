# Fix: Google Sign-In "DEVELOPER_ERROR" on Android

This error appears **only on Android** when the app’s **SHA-1 certificate fingerprint** is not registered in Google Cloud (or Firebase). iOS works because it uses a different configuration (bundle ID + URL scheme).

## Fix (do this once per machine/keystore)

### 1. Get your Android app’s SHA-1

Use the keystore that signs the build you’re testing:

**Debug builds (local dev, emulator, `npx expo run:android`):**

**This project uses the keystore inside the repo**, not the global one. `android/app/build.gradle` has `storeFile file('debug.keystore')`, so you **must** use the project keystore:

```bash
# Project debug keystore (used by this app)
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**If you already added the SHA-1 from `~/.android/debug.keystore` and still get DEVELOPER_ERROR:** that’s a different certificate. Add the SHA-1 from `android/app/debug.keystore` in Google Cloud (project 309236356616) instead.

For this project’s current debug keystore, the SHA-1 is:

```
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

Add that in **APIs & Services → Credentials** → Create OAuth client ID → **Android** (package `com.minaezzat.onesteps`), in the project **309236356616**.

**Release / EAS / Play Store builds:**

- **App installed from Play Store:** Don’t use keytool. Get the SHA-1 from **Google Play Console** → your app → **Setup** → **App integrity** (or **App signing**). Under **App signing key certificate**, copy the **SHA-1** (and SHA-256 if you want). That’s the certificate Google uses to sign the app users install.
- **Your own release keystore (sideloaded APK):** Use keytool on that keystore, e.g.  
  `keytool -list -v -keystore /path/to/your/release.keystore -alias your-key-alias`

From the output (or from Play Console), copy:

- **SHA-1:** line like `SHA1: AB:CD:EF:...`
- (Optional but recommended) **SHA-256:** line like `SHA256: 12:34:56:...`

Use the **same** keystore you use to build the APK/AAB you’re testing.

---

### 2. Register the SHA-1 in Google Cloud Console (correct project)

**Critical:** The Android OAuth client must be in the **same Google Cloud project** that contains your **Web Client ID**. Your app uses this Web Client ID: `309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj.apps.googleusercontent.com` — so you must use the project with number **309236356616** (the same project where your Cloud Run backend `onecrew-backend-staging` lives). If you add the Android client in a different project (e.g. your Firebase project “steps-cfc27”), Sign-In will keep failing with DEVELOPER_ERROR.

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. **Select the project** that has your Web Client ID:
   - Use the project dropdown at the top. Your Web Client ID starts with `309236356616`, so select the project whose **ID or number** is **309236356616** (often the one with Cloud Run service `onecrew-backend-staging`).
   - To confirm: go to **APIs & Services** → **Credentials**. You should see an existing **Web client** (or **OAuth 2.0 Client ID** of type Web application) whose Client ID is `309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj.apps.googleusercontent.com`. If you don’t see it, you’re in the wrong project.
3. In that project, go to **APIs & Services** → **Credentials**.
4. Click **+ Create credentials** → **OAuth client ID**.
5. Application type: **Android**.
6. Fill in:
   - **Name:** e.g. `Steps Android` or `OneCrew Android`.
   - **Package name:** `com.minaezzat.onesteps` (exactly; must match `app.json` → `expo.android.package`).
   - **SHA-1 certificate fingerprint:** paste the **Play Store App signing key** SHA-1 from Play Console (see step 1 for Play Store builds).
7. Click **Create**.

Optional: add **SHA-256** for the same package (create another Android OAuth client with the same package name and SHA-256, or add it in Firebase if you use Firebase).

---

### 3. If you use Firebase

1. Open [Firebase Console](https://console.firebase.google.com/) → your project → **Project settings** (gear) → **Your apps**.
2. Select your **Android** app (package `com.minaezzat.onesteps`).
3. Under **SHA certificate fingerprints**, click **Add fingerprint** and add:
   - The **SHA-1** from step 1.
   - (Optional) The **SHA-256** from step 1.
4. Save.

---

### 4. No code changes required

Your app already uses the correct **Web Client ID** in `GoogleAuthService.ts`. Android is identified by **package name + SHA-1**; you don’t need a separate “Android Client ID” in code for this library.

---

### 5. Test again

- Wait **at least 15–30 minutes** after adding the credential (5 minutes is often not enough; Google can take 30+ minutes to propagate).
- **Uninstall** the app completely (e.g. `adb uninstall com.minaezzat.onesteps`), then install again (e.g. run `npx expo run:android` for debug).
- Try “Sign in with Google” again.

---

### 6. Still failing? Checklist

- [ ] **Right project:** The Android OAuth client is in the **same** project as the Web client. In **APIs & Services → Credentials** you must see a **Web client** with ID `309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj.apps.googleusercontent.com` in that same project (not only in Firebase project “steps-cfc27”.
- [ ] **Package name:** Exactly `com.minaezzat.onesteps` (no space, no suffix like `.debug`).
- [ ] **SHA-1:** For the app installed from the Play Store, you used the **App signing key certificate** SHA-1 from Play Console → Setup → App integrity (not the upload key). For **debug/emulator**, you used the SHA-1 from **android/app/debug.keystore** (this project’s debug keystore), not from `~/.android/debug.keystore`.
- [ ] **Firebase (optional):** If your Android app is registered in Firebase (project “steps-cfc27”), add the same SHA-1 in Firebase Console → Project settings → Your apps → Android app → SHA certificate fingerprints.
- [ ] **Wait & reinstall:** Waited at least 15–30 minutes after creating the Android client, then fully uninstalled the app (`adb uninstall com.minaezzat.onesteps`) and reinstalled.

---

## Summary

| Item              | Value                     |
|-------------------|---------------------------|
| Android package   | `com.minaezzat.onesteps`  |
| Where to add SHA-1| Google Cloud: Credentials → Create OAuth client ID → Android (and/or Firebase: Project settings → Android app → SHA fingerprints) |
| Code              | No change; Web Client ID is already set. |

If you use **EAS Build** or a **release keystore**, add the **release** keystore’s SHA-1 (and SHA-256) as well, and create a separate Android OAuth client (or add the fingerprint in Firebase) for that certificate.
