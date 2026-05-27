# New TestFlight Build (with latest updates)

**Yes — commit first.** EAS Build uses your git state; uncommitted changes are not included in the build.

---

## 1. Commit your changes

```bash
git add -A
git status   # review what’s included
git commit -m "iOS push: APNs-only registration, Stream fix, TS fixes, TestFlight build 26"
```

---

## 2. (Optional) Push to your branch

If you build from a remote (e.g. EAS uses `origin/main`):

```bash
git push origin master
# or: git push origin main
```

---

## 3. Build for TestFlight

```bash
eas build --platform ios --profile production
```

- Uses version **1.3.9** and build **26** (or EAS auto-increment if enabled).
- Wait for the build to finish in the Expo dashboard.

---

## 4. Submit to TestFlight

After the build succeeds:

```bash
eas submit --platform ios --latest
```

- Submits the latest iOS production build to App Store Connect.
- In App Store Connect, wait for processing, then the build appears in TestFlight.

---

## 5. Install on device

- Open the **TestFlight** app on the iPhone.
- Install the new build (1.3.9 (26) or whatever version shows).
- Test push: put app in background, send a message from another device; you should get a notification.

---

**Summary:** Commit → (push) → `eas build --platform ios --profile production` → `eas submit --platform ios --latest`.
