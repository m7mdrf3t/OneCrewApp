# Android release signing for Google Play

## The error you saw

Google Play rejected the bundle because it was signed with the **wrong key**:

- **Play expects:** `SHA1: 08:80:0A:A7:53:30:75:B2:FA:C3:CC:65:8D:57:AA:E8:A9:DD:60:A5`
- **Your upload had:** `SHA1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

You must sign the app bundle with the keystore that has the **expected** SHA1 (the one Play has on file). The upload was signed with a different key (e.g. EAS default credentials or another keystore).

---

## 1. Find the correct keystore

You need the `.jks` / `.keystore` file whose certificate has this SHA1:

`08:80:0A:A7:53:30:75:B2:FA:C3:CC:65:8D:57:AA:E8:A9:DD:60:A5`

Check each keystore’s SHA1 (e.g. if your keystore is in the project or Downloads):

```bash
keytool -list -v -keystore /path/to/your.keystore -alias YOUR_KEY_ALIAS
```

(Replace `YOUR_KEY_ALIAS` with the alias you used when creating the keystore. You’ll be prompted for the keystore password.)

In the output, find **SHA1:** and compare to the expected value above.

If you have `@m7mdrf3t__one-crew.jks` or `@m7mdrf3t__one-crew_OLD_1.jks`, run the same command for each and see which one matches the expected SHA1.

---

## 2. Configure release signing

**Which key was used for the last `bundleRelease`?**  
If `MYAPP_RELEASE_*` were not set in `android/gradle.properties`, the last local `bundleRelease` used the **debug** keystore (so the AAB had the wrong SHA1). The key Play expects (SHA1 `08:80:0A:A7:...`) is the one you created and is in **`@m7mdrf3t__one-crew.jks`** at the project root.

The project is wired to use that keystore for release. **Secrets are kept in a gitignored file** so they are never committed.

1. Copy **`android/gradle-secrets.properties.example`** to **`android/gradle-secrets.properties`** (the latter is in `.gitignore`).
2. Edit **`android/gradle-secrets.properties`** and set:
   - **`MYAPP_RELEASE_STORE_PASSWORD`** – keystore password
   - **`MYAPP_RELEASE_KEY_ALIAS`** – alias (run `keytool -list -keystore ../../@m7mdrf3t__one-crew.jks` to see it)
   - **`MYAPP_RELEASE_KEY_PASSWORD`** – key password  
   (`MYAPP_RELEASE_STORE_FILE` is already set in the example.)
3. Do not commit `gradle-secrets.properties`; it is gitignored.

---

## 3. Build the release AAB

From the project root:

```bash
cd android && ./gradlew bundleRelease && cd ..
```

The AAB will be at: **`android/app/build/outputs/bundle/release/app-release.aab`**.

Upload this file to the **Create open testing release** (or your chosen track) in Play Console. It must be signed with the keystore that has SHA1 `08:80:0A:A7:53:30:75:B2:FA:C3:CC:65:8D:57:AA:E8:A9:DD:60:A5`.

---

## 4. If you build with EAS

If you use **EAS Build** (`eas build --platform android --profile production`), EAS uses its own credentials by default (which produced the wrong SHA1). To fix:

- **Option A – Use your own keystore in EAS:** Run `eas credentials` → Android → production → Set up a new upload key, then upload the keystore that has SHA1 `08:80:0A:A7:53:30:75:B2:FA:C3:CC:65:8D:57:AA:E8:A9:DD:60:A5` (or configure EAS to use the same `MYAPP_RELEASE_*` env vars / gradle.properties in the cloud build).
- **Option B – Build the AAB locally:** Set the release signing properties in `gradle.properties` (see section 2), then run `cd android && ./gradlew bundleRelease` and upload `android/app/build/outputs/bundle/release/app-release.aab` to Play Console.

---

## 5. If you don’t have the original keystore

If you no longer have the keystore with SHA1 `08:80:0A:A7:53:30:75:B2:FA:C3:CC:65:8D:57:AA:E8:A9:DD:60:A5`:

- You **cannot** sign new builds for that app with a different key unless Play allows a **signing key reset**.
- In Play Console: **Setup → App integrity → App signing** (or **Change signing key**). There you can request to use a new key; Google will re-sign your uploads. Only do this if you’ve lost the original key.

Once the correct keystore is configured and you build with the steps above, the “wrong key” error should go away.
