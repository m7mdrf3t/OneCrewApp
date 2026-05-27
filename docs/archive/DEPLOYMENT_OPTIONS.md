# Deployment Options for Flickering Fix

## Change Type
**Pure JavaScript/TypeScript change** in `src/contexts/ApiContext.tsx`
- ✅ No native code changes
- ✅ No app.json changes needed
- ✅ Compatible with EAS Update (OTA)

## Option 1: EAS Update (OTA) - Recommended ⚡

**Fastest option** - No rebuild needed, no App Store review

### Steps:

```bash
# 1. Make sure you're logged in
eas login

# 2. Publish update to production channel
eas update --branch production --message "Fix: Memoize getStreamChatToken to prevent infinite loop and flickering"

# 3. Users will get the update automatically on next app launch
```

**Benefits:**
- ⚡ **Instant** - No build wait time (15-30 min)
- ✅ **No App Store review** - Updates are delivered immediately
- ✅ **No new build number** - Uses existing build
- ✅ **Automatic** - Users get update on next app launch

**Limitations:**
- Requires users to have the app installed (they'll get update on next launch)
- Update is delivered via Expo's update service

---

## Option 2: New EAS Build - For Tracking 📦

**If you want a new build number** to track this fix in TestFlight

### Steps:

```bash
# 1. Build number is already at 19, so it will auto-increment to 20
eas build --platform ios --profile production

# 2. After build completes, submit to TestFlight
eas submit --platform ios --latest
```

**Benefits:**
- ✅ **New build number** - Tracks fix in build history
- ✅ **Full rebuild** - Ensures everything is fresh
- ✅ **TestFlight tracking** - Shows as new build in TestFlight

**Drawbacks:**
- ⏱️ **Slower** - 15-30 minutes build time
- 📋 **App Store review** - TestFlight builds need processing (10-30 min)

---

## Recommendation

**For this critical bug fix, I recommend Option 1 (EAS Update):**

1. **Faster deployment** - Users get the fix immediately
2. **No waiting** - No build queue or App Store processing
3. **Critical fix** - This prevents app crashes, so faster is better

You can always create a new build later if you want to track it in TestFlight.

---

## Current Status

- **Version:** 1.3.7
- **Build Number:** 19 (iOS)
- **Runtime Version:** 1.3.7
- **EAS Update:** ✅ Configured (updates.url present)

---

## Quick Command

**To deploy immediately:**
```bash
eas update --branch production --message "Fix: Prevent infinite loop in StreamChatProvider (flickering/restart fix)"
```

**To create new build:**
```bash
./build-testflight.sh
```
