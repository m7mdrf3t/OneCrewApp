# EAS iOS Build: "Install dependencies" phase failed

When EAS fails with **"Unknown error. See logs of the Install dependencies build phase"**, the real error is in the build log. Use this to find and fix it.

## 1. Get the actual error

1. Open the build URL from the terminal, e.g.:  
   `https://expo.dev/accounts/m7mdrf3t/projects/one-crew/builds/<build-id>`
2. Open the **Build log**.
3. Expand the **"Install dependencies"** step.
4. Scroll to the **bottom** of that step; the failing command (e.g. `npm install` or `patch-package`) and the error message are usually there.

## 2. Common causes and fixes

### A. `file:packages/onecrew-api-client-2.29.0.tgz` not found (ENOENT)

- **Cause:** The `packages/` folder (with the `.tgz` file) was not uploaded to EAS.
- **Fix:**
  - Ensure `packages/onecrew-api-client-2.29.0.tgz` exists locally and is **not** in `.gitignore`.
  - If it’s not tracked: `git add packages/onecrew-api-client-2.29.0.tgz` and commit. EAS uses `.gitignore`; ignored files are not uploaded.
  - Do **not** add `packages/` or `*.tgz` to `.easignore` (or add `!packages/` if you use `.easignore` and need to force-include it).

### B. `patch-package` failed

- **Cause:** A patch didn’t apply (e.g. dependency version on EAS differs from your lockfile).
- **Fix:**
  - In the log, note which patch failed (e.g. `expo-dev-launcher+6.0.20.patch`, `stream-chat-react-native+8.12.0.patch`).
  - Locally run `npm install` and then `npx patch-package`; if it fails, the patch may need to be recreated for the installed version.
  - Ensure `package.json` versions match the patch filenames (e.g. `expo-dev-client: ~6.0.20` → `expo-dev-launcher+6.0.20.patch`).
  - Commit an updated patch or relax the version in `package.json` so the patch applies on EAS.

### C. CocoaPods / `pod install` errors

- **Cause:** Sometimes the log groups CocoaPods under "Install dependencies" or a later step.
- **Fix:** In the same build log, check the step that runs `pod install` (often after npm). Fix the reported Podfile or gem version issue there.

### D. Network / timeout

- **Cause:** Transient failure fetching packages.
- **Fix:** Retry the build. If it keeps failing, try pinning the iOS image in `eas.json` (e.g. `"ios": { "image": "latest" }`) and rebuilding.

## 3. What we changed in this project

- **eas.json** – Production profile now has `ios.image: "latest"` and `NPM_CONFIG_LEGACY_PEER_DEPS: "true"` to make the install phase more consistent and avoid peer-dep issues.
- **Packages** – `packages/` is not in `.gitignore`, so it is uploaded to EAS. Do not add it to `.easignore` unless you intentionally exclude it.

## 4. After fixing

Run the iOS production build again:

```bash
eas build --platform ios --profile production
```

If it still fails, use the **exact** error line from the "Install dependencies" step and search for it or share it for further help.
