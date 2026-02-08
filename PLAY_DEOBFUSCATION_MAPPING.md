# Upload deobfuscation (mapping) file to Google Play

After a release build, R8 produces a **mapping file** that lets Google Play turn obfuscated crash/ANR stack traces into readable ones. Upload it so the "no deobfuscation file" warning goes away and crash reports are useful.

---

## Where the file is

After running `./gradlew bundleRelease` from the `android/` folder:

- **Default path:** `android/app/build/outputs/mapping/release/mapping.txt`
- **Versioned copy:** `android/app/build/outputs/mapping/release/mapping-<versionName>-<versionCode>.txt`  
  Example: `mapping-1.3.10-24.txt`

The build also prints the path when it finishes.

---

## How to upload in Play Console

1. Open [Google Play Console](https://play.google.com/console) → your app.
2. Go to **Release** → **Production** (or **Testing** → **Open testing**, if that’s where you released).
3. Open the release that contains the version you built (e.g. the one with version code 24).
4. Find the **App bundle** or **App bundle explorer** section for that release.
5. Select the bundle (e.g. version code 24).
6. Look for **Upload mapping file**, **Deobfuscation file**, or **ProGuard mapping**.
7. Upload **`mapping.txt`** (or the versioned `mapping-1.3.10-24.txt`) from the path above.

Exact labels can vary; if you don’t see it next to the bundle, check **Release** → **App integrity** or the **Version** detail page for that version code.

---

## When it’s generated

The mapping file is only created when **R8/minification** is enabled for release (it is enabled via `android.enableMinifyInReleaseBuilds=true` in `android/gradle.properties`). Every release build then produces a new mapping file; upload the one that matches the version you published.

---

## Disabling minification

If you need to turn off R8 (e.g. to debug release builds), in `android/gradle.properties` set:

```properties
android.enableMinifyInReleaseBuilds=false
```

No mapping file will be generated, and the Play Console warning will remain until you turn minification back on and upload a mapping file for that version.
