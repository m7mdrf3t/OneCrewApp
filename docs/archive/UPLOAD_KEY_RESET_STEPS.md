# Request upload key reset – step by step

Follow these steps to finish the **Request upload key reset** flow in Google Play Console so you can use a new keystore (one of your existing `.jks` files) for future releases.

---

## Step 1: In Play Console – select reason

1. On the **Request upload key reset** page, under **"Select the reason for resetting your upload key"**:
2. Leave **"I lost my upload key"** selected (or choose the option that fits).
3. Go to the next step (e.g. **Continue** or **Next**).

---

## Step 2: Choose which keystore to use as the new key

You will use **one** of these as your new upload key:

- **`@m7mdrf3t__one-crew.jks`**
- **`@m7mdrf3t__one-crew_OLD_1.jks`**

Pick one and use it for both **Step 3** (export PEM) and for **all future release builds** after the reset is approved.

---

## Step 3: Export the certificate as a PEM file

Open a terminal and run **one** of the commands below. Replace **`YOUR_ALIAS`** with the actual alias from your keystore (the name you see when you list the keystore).

**If you don’t know the alias**, run this first to list it:

```bash
keytool -list -keystore "/Users/aghone01/Documents/CS/OneCrewApp/@m7mdrf3t__one-crew.jks"
```

Use the alias name shown (e.g. `upload`, `key0`, `my-key-alias`).

---

**Option A – using `@m7mdrf3t__one-crew.jks`:**

```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
keytool -export -rfc -keystore "@m7mdrf3t__one-crew.jks" -alias YOUR_ALIAS -file upload_certificate.pem
```

**Option B – using `@m7mdrf3t__one-crew_OLD_1.jks`:**

```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
keytool -export -rfc -keystore "@m7mdrf3t__one-crew_OLD_1.jks" -alias YOUR_ALIAS -file upload_certificate.pem
```

- Enter the **keystore password** when prompted.
- This creates **`upload_certificate.pem`** in your project folder:  
  `/Users/aghone01/Documents/CS/OneCrewApp/upload_certificate.pem`

---

## Step 4: Upload the PEM file in Play Console

1. On the **Request upload key reset** page, find **"Upload the .PEM file generated from your upload key certificate"**.
2. Click the **blue upload button** (with the upward arrow).
3. Choose the file: **`/Users/aghone01/Documents/CS/OneCrewApp/upload_certificate.pem`**.
4. Submit the request (e.g. **Submit** or **Send**).

---

## Step 5: Wait for Google to approve

- Google reviews the request (often within a few days).
- You may get an email when it’s approved.
- After approval, **only this new upload key** can be used for new releases for this app.

---

## Step 6: After approval – build and upload your release

1. **Configure release signing** in `android/gradle.properties` (uncomment and set):
   - `MYAPP_RELEASE_STORE_FILE=/Users/aghone01/Documents/CS/OneCrewApp/@m7mdrf3t__one-crew.jks`  
     (or the path to the **same** keystore you used for the PEM in Step 3)
   - `MYAPP_RELEASE_STORE_PASSWORD=` your keystore password  
   - `MYAPP_RELEASE_KEY_ALIAS=` the alias you used in Step 3  
   - `MYAPP_RELEASE_KEY_PASSWORD=` your key password  

2. **Verify the keystore password** (optional but recommended):
   ```bash
   export MYAPP_RELEASE_STORE_PASSWORD=your-actual-store-password
   export MYAPP_RELEASE_KEY_PASSWORD=your-actual-key-password
   ./android/verify-release-keystore.sh
   ```
   If you see "Keystore password OK", the same env vars will work for the build. If you see "password was incorrect", fix the passwords (and avoid a leading `your-` if that was left from the placeholder).

3. **Build the release AAB**:
   ```bash
   cd /Users/aghone01/Documents/CS/OneCrewApp/android && ./gradlew bundleRelease
   ```
   The AAB will be at `android/app/build/outputs/bundle/release/app-release.aab` and will be signed with the key Play expects (SHA1 08:80:0A:A7:...).

4. **Upload to Play Console:**
   - Open your app → **Testing** → **Open testing** (or the track you use).
   - Create a new release and upload:  
     **`android/app/build/outputs/bundle/release/app-release.aab`**

After the reset is approved, Play will accept this new key and your release will go through.
