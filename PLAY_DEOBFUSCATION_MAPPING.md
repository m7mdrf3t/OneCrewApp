# Upload deobfuscation (mapping) file to Google Play

After a release build, R8 produces a **mapping file** that lets Google Play turn obfuscated crash/ANR stack traces into readable ones. Upload it so the “no deobfuscation file” warning goes away and crash reports are useful.

**Minification is enabled** for release, so every release build generates a mapping file.

---

## Where the file is

After running `./gradlew bundleRelease` from the `android/` folder:

- **Default path:** `android/app/build/outputs/mapping/release/mapping.txt`
- **Versioned copy:** `android/app/build/outputs/mapping/release/mapping-<versionName>-<versionCode>.txt`  
  Example: `mapping-1.3.10-24.txt`

The build also prints the path when it finishes.

---

## How to upload the deobfuscation file (step-by-step)

1. **Build the release** (if you haven’t):
   ```bash
   cd android && ./gradlew bundleRelease && cd ..
   ```
2. **Locate the mapping file** on your machine:
   - **Path:** `android/app/build/outputs/mapping/release/mapping.txt`
   - Or: `mapping-1.4.1-28.txt` in the same folder (if the build created a versioned copy).
3. Open [Google Play Console](https://play.google.com/console) → your app (**Steps**).
4. Go to **Release** → **Production** (or **Testing** → **Open testing**, depending on your track).
5. Open the **release** you’re editing (e.g. “Create production release” or the draft).
6. In the release, find the **App bundles** section (list of bundles in this release).
7. Click the **version code** of the bundle you just uploaded (e.g. **28**), or the bundle row.
8. On the bundle detail / explorer, look for **“Upload mapping file”**, **“Deobfuscation file”**, or **“ProGuard mapping”** and click it.
9. Choose **`mapping.txt`** (or the versioned file) from the path in step 2 and upload it.
10. Save / continue the release. The “no deobfuscation file” warning should clear for that version.

If you don’t see the option next to the bundle, try **Release** → **App integrity** → **App signing** → select the version, or the **Version** detail page for that version code.

---

## When it’s generated

**R8/minification is enabled** for release (`android.enableMinifyInReleaseBuilds=true` in `android/gradle.properties`). Every `./gradlew bundleRelease` produces a mapping file. Upload the one that matches the version you published so Play can deobfuscate crashes and the “no deobfuscation file” warning goes away.

---

## Disabling minification

If you need to turn off R8 (e.g. to debug release builds), in `android/gradle.properties` set:

```properties
android.enableMinifyInReleaseBuilds=false
```

No mapping file will be generated, and the Play Console warning will remain until you turn minification back on and upload a mapping file for that version.

---

## Play Console: “Artifact significantly increases size”

To reduce download size and address that warning, release builds use:

- **R8 minification** (`android.enableMinifyInReleaseBuilds=true`) – shrinks and obfuscates code.
- **Resource shrinking** (`android.enableShrinkResourcesInReleaseBuilds=true`) – removes unused resources.

You’re already shipping an **App Bundle** (AAB), so Play serves split APKs per device. Enabling minify + shrink keeps the bundle smaller and improves install/update success. Remember to **upload the mapping file** for each release (see above) so crashes can be deobfuscated.

---

## Remove old / shadowed bundle from a release (step-by-step)

If Play shows: *“This APK will not be served to any users because it is completely shadowed by one or more APKs with higher version codes”*, you have an **older bundle** (e.g. version code 27) in the same release as a **newer one** (e.g. 28). Remove the old bundle so only the latest is in the release.

1. Open [Google Play Console](https://play.google.com/console) → your app.
2. Go to **Release** → **Production** (or the track where you see the error).
3. Open the release (e.g. **“Create production release”** or the draft with the error).
4. In **“App bundles”** or **“Release”** section, you’ll see a list of bundles (e.g. version code 27 and 28).
5. Find the **old** bundle (e.g. **version code 27**). There is usually a **trash / remove** icon or a **“Remove”** link on that row.
6. Click **Remove** (or the trash icon) for the **version code 27** bundle only. Do **not** remove the higher version code (e.g. 28).
7. Confirm removal if prompted. The error about “shadowed” APK should disappear.
8. Upload the **deobfuscation file** for the bundle you’re keeping (e.g. 28) as in the section above.
9. Finish **“Preview and confirm”** and roll out the release.

**Summary:** Keep only the bundle with the **highest version code** in the release; remove any lower version codes from this release.
