# Android release signing for Google Play

## The error you saw

Google Play rejected the bundle because it was signed with the **wrong key**:

- **Play expects:** `SHA1: 9E:18:23:93:BF:9A:C2:5F:63:F0:57:82:89:CF:3F:9A:94:20:2E:FE`
- **Your upload had:** `SHA1: 08:80:0A:A7:...` (that’s the **debug** keystore)

Release builds were using the debug keystore. They need to use the **same** keystore that was used for the first upload to Play (the one with the expected SHA1 above).

---

## 1. Find the correct keystore

You need the `.jks` file that was used when the app was first published to Play (the one with fingerprint `9E:18:23:93:BF:9A:...`).

Check each keystore’s SHA1 (e.g. if your keystore is in Downloads):

```bash
keytool -list -v -keystore /Users/aghone01/Downloads/your-keystore.jks -alias YOUR_KEY_ALIAS
```

(Replace `YOUR_KEY_ALIAS` with the alias you used when creating the keystore. You’ll be prompted for the keystore password.)

In the output, find **SHA1:** and compare to:

`9E:18:23:93:BF:9A:C2:5F:63:F0:57:82:89:CF:3F:9A:94:20:2E:FE`

If you have `@m7mdrf3t__one-crew_OLD_1.jks`, run the same command for it and see which one matches.

---

## 2. Configure release signing

1. Open **`android/gradle.properties`**.
2. At the bottom there are commented lines for release signing. **Uncomment** and set them:

   - **`MYAPP_RELEASE_STORE_FILE`** – path to your `.jks`.  
     If the keystore is in Downloads:  
     `MYAPP_RELEASE_STORE_FILE=/Users/aghone01/Downloads/your-keystore.jks`  
     (Replace `your-keystore.jks` with the actual filename.)
   - **`MYAPP_RELEASE_STORE_PASSWORD`** – keystore password.
   - **`MYAPP_RELEASE_KEY_ALIAS`** – alias of the key you use for release.
   - **`MYAPP_RELEASE_KEY_PASSWORD`** – key password.

3. **Do not commit real passwords.** Prefer:
   - Keeping them only in local `gradle.properties` (ensure it’s in `.gitignore` if you add secrets there), or
   - Using environment variables and reading them in `build.gradle` (e.g. `System.getenv("MYAPP_RELEASE_STORE_PASSWORD")`).

Example (replace with your real values and do not commit if the file is tracked):

```properties
MYAPP_RELEASE_STORE_FILE=/Users/aghone01/Downloads/your-keystore.jks
MYAPP_RELEASE_STORE_PASSWORD=your-store-password
MYAPP_RELEASE_KEY_ALIAS=your-key-alias
MYAPP_RELEASE_KEY_PASSWORD=your-key-password
```

---

## 3. Build the release AAB

From the project root:

```bash
cd android && ./gradlew bundleRelease && cd ..
```

The AAB will be at: **`android/app/build/outputs/bundle/release/app-release.aab`**.

Upload this file to the **Create open testing release** (or your chosen track) in Play Console. It must be signed with the keystore that has SHA1 `9E:18:23:93:BF:9A:...`.

---

## 4. If you build with EAS

If you use **EAS Build** (`eas build --platform android --profile production`), the same `build.gradle` and `gradle.properties` are used. As long as the release signing properties are set in `gradle.properties` (or via env in your build), the EAS-built AAB will be signed with your release key.

---

## 5. If you don’t have the original keystore

If you no longer have the keystore with SHA1 `9E:18:23:93:BF:9A:...`:

- You **cannot** sign new builds for that app with a different key unless Play allows a **signing key reset**.
- In Play Console: **Setup → App integrity → App signing** (or **Change signing key**). There you can request to use a new key; Google will re-sign your uploads. Only do this if you’ve lost the original key.

Once the correct keystore is configured and you build with the steps above, the “wrong key” error should go away.
