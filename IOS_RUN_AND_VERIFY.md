# Run iOS App and Verify Config State

## Run

From the project root:

```bash
npx expo run:ios
```

Or to target a physical device:

```bash
npx expo run:ios --device
```

Keep the **Metro bundler terminal** (the one that shows `LOG`/`WARN`/`ERROR` from the app) in view. With `expo run:ios`, app logs usually appear in that same terminal after the app launches.

---

## What to Watch in the Logs (current state)

Use this checklist while the app starts and you log in (or stay logged in).

### 1. Firebase initialization

- **Success**
  - `✅ [Firebase] Already initialized (native config)`  
    or  
  - `✅ [Firebase] Initialized from app config`
  - `✅ [Firebase] Active project: steps-cfc27`
- **Failure**
  - `⚠️ [Firebase] Init failed: ...`  
  - No line with `Active project: steps-cfc27`  
  → Fix: ensure `databaseURL` in `app.json` and `GoogleService-Info.plist`; plist in Xcode target.

### 2. Push token (FCM)

- **Success**
  - `✅ [Backend] Push token registered successfully via API client`
  - `📱 [Backend] Token (first 20 chars): ...`
- **Failure**
  - `❌ [Token] Error registering for push notifications`
  - `⚠️ Firebase messaging not available after retries`  
  → Usually means Firebase init failed or messaging not ready; fix Firebase first.

### 3. Stream Chat push device

- **Success**
  - `✅ [StreamChat] Device registered for push notifications with Stream`
- **Failure**
  - `⚠️ [StreamChat] Could not register device for push`  
  → Stream may not be connected yet, or Stream Dashboard push (APNs) not configured.

### 4. Background message handler

- **Success**
  - No error after a few seconds about background handler.
- **Failure**
  - `❌ [BackgroundHandler] Failed to set up background handler after all retries`  
  → Typically means Firebase never initialized; fix Firebase init (and `databaseURL`).

---

## Quick “all good” check

After the app has been open and you’re logged in, you should see:

1. `✅ [Firebase] Active project: steps-cfc27`
2. `✅ [Backend] Push token registered successfully`
3. `✅ [StreamChat] Device registered for push notifications with Stream`
4. No `❌ [BackgroundHandler] Failed to set up background handler after all retries`

If all four are true, Firebase, push token, and Stream push config are in a good state for that run.

---

## If run:ios fails on your machine

- **“Can't determine id of Simulator app”**  
  - Run: `sudo xcode-select -s /Applications/Xcode.app`  
  - Open Xcode once and accept the license if prompted.

- **“Simulator is most likely not installed”**  
  - Install Xcode from the App Store and install the iOS Simulator from Xcode → Settings → Platforms.
