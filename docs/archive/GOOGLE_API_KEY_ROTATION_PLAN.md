# Google API Key Rotation Plan (After Push Testing)

This document captures the exact files that contain the **old Firebase client API key**, what to replace after generating the new key, and a safe cutover checklist that avoids downtime.

---

## Scope

**Old key (compromised):**

```
AIzaSyAoblukkusgsmS6b-TdhdeJrpkY5qaUczA
```

This is the **Firebase client API key** (used by mobile apps). It is not a secret in mobile builds, but Google flags it if it appears publicly. We will rotate and restrict it **after** verifying push on physical devices.

---

## Files that contain the old key

A repo-wide search for the exact key found only these files:

1. **`app.json`**
   - `expo.extra.firebaseConfig.apiKey`
2. **`ios/Steps/GoogleService-Info.plist`**
   - `<string>AIzaSyAoblukkusgsmS6b-TdhdeJrpkY5qaUczA</string>`

No other files in this repo contain this key.

---

## What to replace after you generate the new key

After creating a new Firebase API key:

### 1) Update iOS Firebase config
- Download a new **`GoogleService-Info.plist`** from Firebase Console.
- Replace:
  ```
  ios/Steps/GoogleService-Info.plist
  ```

### 2) Update Android Firebase config
- Download a new **`google-services.json`** from Firebase Console.
- Replace:
  ```
  android/app/google-services.json
  ```

### 3) Update `app.json`
Replace:
```json
"apiKey": "AIzaSyAoblukkusgsmS6b-TdhdeJrpkY5qaUczA"
```
with the new key.

---

## Safe cutover checklist (no downtime)

**This order prevents breaking old builds.**

### Phase 1 — Before rotation (pre-checks)
- [ ] Push notifications verified on **physical iOS** devices
- [ ] Push notifications verified on **physical Android** devices
- [ ] Stream APNs + Firebase configs are enabled and working

### Phase 2 — Create and restrict new key
- [ ] Create **new API key** in Google Cloud Console → APIs & Services → Credentials
- [ ] Add **application restrictions**:
  - iOS: bundle ID `com.minaezzat.onesteps`
  - Android: package `com.minaezzat.onesteps` + SHA‑1 fingerprints (debug + release)
- [ ] Add **API restrictions** (limit to needed Firebase APIs)

### Phase 3 — Update files and ship builds
- [ ] Replace `GoogleService-Info.plist`
- [ ] Replace `google-services.json`
- [ ] Update `app.json` `firebaseConfig.apiKey`
- [ ] Build and release:
  - Android APK (testing)
  - iOS TestFlight

### Phase 4 — Retire old key
- [ ] Once most users update:
  - Delete old key **OR**
  - Restrict old key so tightly it can’t be abused

---

## Ready-for-release confirmation (after push tests)

Once push is confirmed on physical devices:

- ✅ **Ready to build Android APK**
- ✅ **Ready for iOS TestFlight build**

---

## Notes

- This is a **Firebase client API key** (expected in mobile apps), but it should still be restricted and rotated after public exposure.
- Do **not** commit new secrets or credentials into public repos.
