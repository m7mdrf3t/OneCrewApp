# Plan: Fix Google Play “Misleading Claims” – Icon & Name Match

## What Google Rejected

- **Policy:** [Misleading Claims](https://support.google.com/googleplay/android-developer/answer/9888170)  
- **Issue:** When installed, the app’s **icon** and/or **name** don’t match what’s shown in the **store listing**.
- **Specific areas flagged:**
  - **Launch / On Device Icon** (see LAUNCHER_ICON-9489.png from Play Console)
  - **Hi-res icon (en-US)** (see HI_RES_ICON-6591.png from Play Console)

So the fix is: **store listing and on-device app must show the same name and the same icon (including hi-res).**

---

## What the Screenshot Shows (Exact Mismatch)

| Location | What’s shown | Correct? |
|----------|----------------|----------|
| **App icon (en-US)** (store listing) | Light grey square with **three horizontal white bars** (stylized “E” / hamburger) | ✅ Correct – your **official logo** (animates to "Steps" on load) |
| **Launcher icon** (on device) | **Black circular logo with “ONE CREW”** in white text, app name **“Steps”** below | ❌ Old – the **app** was built with the previous icon |

So: the **store** already shows the right logo (three-bars). The **on-device** launcher is still the old ONE CREW icon from an earlier build. You need to **ship a new app build** that uses the **three-bars** icon as the launcher so it matches the store.

**App icon asset:** the three-bars icon is **`assets/Steps.png`** (already in your repo).

---

## Step-by-step fix

**Step 1 – Use Steps.png as the app icon (codebase)**  
- The app is configured to use **`assets/Steps.png`** for the launcher icon (`app.json` → `icon` and `android.adaptiveIcon.foregroundImage`).  
- Confirm **`assets/Steps.png`** exists in the assets folder. No code change needed.

**Step 2 – Regenerate Android launcher from Steps.png**  
- In the project root run: `npx expo prebuild --platform android --clean`  
- This rebuilds the Android mipmap launcher icons from **Steps.png**.

**Step 3 – Build a new release AAB**  
- Build the release bundle (e.g. EAS Build or `cd android && ./gradlew bundleRelease`).  
- The new AAB will show the **Steps.png** (three-bars) icon on the device.

**Step 4 – Prepare 512×512 for the store**  
- Export or resize **`assets/Steps.png`** to **512×512 PNG** (Google’s required size for store graphics).  
- Use this file for both **App icon** and **Hi-res icon (en-US)** in Play Console.

**Step 5 – Update Play Console store listing**  
- Open **Play Console** → your app → **Store presence** → **Main store listing**.  
- Under **Graphics**: **App icon** → upload the 512×512 from **Steps.png**; **Hi-res icon (en-US)** → upload the same 512×512.  
- **App name** = **Steps**. **Save** the listing.

**Step 6 – Upload and send for review**  
- In **Release** → upload the **new AAB** from Step 3.  
- **Publishing overview** → **Send for review**.  
- Store and installed app will both show the **Steps.png** (three-bars) icon.

---

## Verify the new icon before submitting (recommended)

**Yes – build and install a release build on a real Android device before you submit to Play.** That way you confirm the launcher shows the **Steps.png** (three-bars) icon and the name **Steps**, so the store and the app match.

### Option A: Install the release APK on your device (simplest)

1. **Build a release APK** (same code as the AAB, different format for direct install):
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
   Output: `android/app/build/outputs/apk/release/app-release.apk`

2. **Copy the APK to your phone** (USB, cloud, or email) and **install** it (allow “Install from unknown sources” if prompted).

3. **Check on the home screen / app drawer:**
   - App name under the icon = **Steps**
   - Launcher icon = **three-bars** (Steps.png), **not** the old ONE CREW circle.

4. Open the app and do a quick sanity check. If everything looks good, the **same** AAB you built with `bundleRelease` is safe to upload to Play.

### Option B: Use Internal testing track (optional)

1. In Play Console: **Test and release** → **Testing** → **Internal testing**.
2. Create a new release and **upload the same AAB** you will use for Production.
3. Add yourself (and testers) and install from the internal testing link.
4. Confirm launcher icon = three-bars and name = **Steps**, then use that AAB for Production.

**Recommendation:** Do **Option A** once (build APK → install → verify icon and name), then submit the AAB to Production. No need to build a separate “test” AAB – the release AAB and the release APK use the same native icon.

---

## Google Play Console: step-by-step submission

Use this after you’ve verified the new icon on a device (see above).

### 1. Open your app in Play Console

- Go to [Play Console](https://play.google.com/console).
- Select the app **Steps** (com.minaezzat.onesteps).

### 2. (Optional) Align store listing with the new icon

- Go to **Store presence** → **Main store listing**.
- Under **Graphics**:
  - **App icon**: upload a **512×512 PNG** of **Steps.png** (three-bars). If it’s already correct, leave it.
  - **Hi-res icon (en-US)**: upload the **same** 512×512 PNG.
- **App name**: **Steps** (max 30 characters). **Save** if you changed anything.

### 3. Upload the new release (AAB)

- In the left menu: **Test and release** → **Production** (or the track that was rejected).
- Click **Create new release** (or **Create release** / **New release**).
- In the release:
  - **App bundles**: click **Upload** and choose your **app-release.aab** from:
    - `android/app/build/outputs/bundle/release/app-release.aab`
  - Add **Release name** (e.g. “Icon fix – three-bars launcher”) and/or **Release notes** for “What’s new” if needed.
- Click **Save** (or **Next**).

### 4. Complete the release

- Resolve any warnings (e.g. permissions, target API) if shown.
- Click **Review release** (or **Next** until you reach the review step).
- Confirm the new version (versionCode **27**) and the bundle are the one you tested.

### 5. Send for review

- Go to **Publishing overview** (left menu or top).
- You should see pending changes (e.g. “Production release ready”).
- Click **Send for review** (or **Start rollout to Production** / equivalent).
- Submit. Google will review the new build and store listing (icon/name match).

### 6. After approval

- The new version will replace the rejected one on Production.
- New installs will see the **Steps.png** launcher icon and name **Steps**, matching the store.

**Summary:** Verify on device with the release APK (or internal testing) that the launcher shows the three-bars icon and “Steps”, then in Play Console upload the **same** AAB to Production (or the rejected track), fix store graphics if needed, and **Send for review**.

---

## Current State in Your Repo

| Item | Source | Value |
|------|--------|--------|
| **App name (user-facing)** | `app.json` → `expo.name` | **Steps** |
| **App name (Android)** | `android/.../res/values/strings.xml` → `app_name` | **Steps** |
| **Icon (Expo)** | `app.json` → `icon` | `./assets/Steps.png` |
| **Android adaptive icon** | `app.json` → `android.adaptiveIcon` | `./assets/Steps.png`, bg `#000000` |
| **Launcher icon (APK)** | `AndroidManifest.xml` | `@mipmap/ic_launcher` / `ic_launcher_round` |
| **Mipmaps** | Generated from **Steps.png** | In `android/.../res/mipmap-*` and `mipmap-anydpi-v26` |

Your **on-device** app therefore shows:
- **Name:** “Steps”
- **Icon:** The launcher icon built from **`assets/Steps.png`** (three-bars).

Anything different in the Play Console (name or icon) will trigger this rejection.

---

## Fix Plan

### Phase 1: Align the app (codebase)

1. **Keep a single source of truth for name**
   - Ensure **only** “Steps” is used as the user-facing name.
   - In this repo, that’s already: `app.json` → `expo.name` and `strings.xml` → `app_name`. No change needed unless you intentionally rename the app.

2. **Use the three-bars icon as the app (launcher) icon**
   - The **official logo** is the **three-bars** icon (animates to "Steps" on load). Your app uses **`assets/Steps.png`** for the launcher (three-bars). If your last published build shows ONE CREW on device, that build may have used different assets or an older version. To avoid future mismatch:
     - Keep `assets/icon.png` and `assets/adaptive-icon.png` as the **three-bars** icon (same as on device: black circle, “ONE CREW” in white). Use a square image (e.g. 1024×1024) for `icon.png` and a foreground-only version for `adaptive-icon.png` (same design, transparent or black background).
     - If you have the three-bars icon in another file (e.g. from design), use that; ensure it’s the same asset you want on the store.
   - After any icon change, regenerate Android resources and rebuild:
     - `npx expo prebuild --platform android --clean`
     - Then build your release AAB/APK (e.g. `cd android && ./gradlew bundleRelease` or your EAS build).

3. **Use the same three-bars 512×512 for the store**
   - For Play Console you need a **512×512 PNG** of the **three-bars** icon (same as **Steps.png**).
   - Export from icon.png or your design source (e.g. export from design tool, or resize/crop from a high-res three-bars image). Use this **same file** for both “App icon” and “Hi-res icon (en-US)” in the store listing.
   - Store and launcher will then match.

### Phase 2: Align the store listing (Play Console) — **Main fix**

Do this so the store matches what users see on device (ONE CREW logo + “Steps”).

1. **App name**
   - **Store listing → Main store listing (and en-US):**
     - **App name** = **Steps** (max 30 characters).
   - **Store listing → Short description / Full description:**  
     - Don’t promise a different name or brand; keep “Steps” consistent.

2. **App icon (store)** — use three-bars 512×512
   - **Store listing → Graphics → App icon**
   - Upload a **512×512 PNG** of the **three-bars** icon (same as **Steps.png**).
   - No extra text, badges, or “beta” that aren’t on the real launcher icon.

3. **Hi-res icon (en-US)** — must match launcher
   - **Store listing → Graphics → Hi-res icon (en-US)** (or equivalent under your default / en-US listing).
   - Use the **same** 512×512 PNG as the app icon (the three-bars icon). Use the same file for Hi-res icon (en-US).

4. **Screenshots**
   - If any screenshot shows an old icon or a different app name, update or remove it so it matches the current “Steps” icon and name.

5. **Other store listings**
   - If you have other languages or custom store listings, set **App name** and **App icon / Hi-res icon** to the same “Steps” and same 512×512 icon so they all match the installed app.

### Phase 3: Rebuild, test, resubmit

1. **Build**
   - Clean prebuild: `npx expo prebuild --platform android --clean`
   - Build release: your usual command (e.g. EAS Build or `./gradlew bundleRelease`).

2. **Test on a real device**
   - Install the new build.
   - Confirm:
     - Launcher label = **Steps**.
     - Launcher icon = same as the 512×512 you’ll upload to Play Console.
   - Take a screenshot of the home screen with the Steps icon and name; use it to double-check against the store listing before submit.

3. **Update Play Console**
   - Upload the **new** AAB.
   - Ensure store listing (name + app icon + hi-res icon) is updated as in Phase 2.
   - Save and send the new version for review (Publishing overview → send for review).

---

## Pre-resubmission checklist

- [ ] **Store listing → App icon** and **Hi-res icon (en-US)** = 512×512 PNG of the **three-bars** icon (same as `icon.png`).
- [ ] **Store listing → Hi-res icon (en-US)** = same 512×512 three-bars PNG.
- [ ] **Store listing → App name** = “Steps” for default and en-US (and any other listings).
- [ ] No screenshot in the listing shows the old three-bar icon or a different app name.
- [ ] (Optional for next build) Repo `assets/icon.png` and `assets/adaptive-icon.png` use the three-bars icon; run prebuild and rebuild so future builds match the store; then run `npx expo prebuild --platform android --clean` and rebuild.
- [ ] App name in **strings.xml** = “Steps” (and matches `app.json`).
- [ ] Send for review from **Publishing overview** (store listing change only is enough if you didn’t change the AAB).

---

## If you don’t have the Play Console screenshots

Google attached:
- **LAUNCHER_ICON-9489.png** – what they consider the “launch/on device” icon.
- **HI_RES_ICON-6591.png** – what they consider the “hi-res icon (en-US)”.

If you have these from the rejection email or Play Console, compare:
- LAUNCHER_ICON vs the icon on a device with your current build.
- HI_RES_ICON vs what you have under Store listing → Graphics → Hi-res icon (en-US).

Then either:
- **Change the store listing** so both graphics match the on-device icon, or  
- **Change the app icon** (and store assets) so everything uses one consistent design, then follow the plan above.

---

## Summary

| Goal | Action |
|------|--------|
| Name match | Use “Steps” everywhere: app (`strings.xml` / `app.json`) and all store listings. |
| Icon match | Three-bars for both launcher (from `icon.png` + `adaptive-icon.png`) and store (512×512 PNG). |
| Hi-res match | Use the same 512×512 as “App icon” for “Hi-res icon (en-US)”. |
| No drift | After any icon/name change: prebuild → build → test on device → update store listing → resubmit. |

After these steps, the store listing and the installed app will match, which is what the Misleading Claims policy requires.
