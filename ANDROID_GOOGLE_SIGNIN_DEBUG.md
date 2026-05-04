# Debug Android Google Sign-In (DEVELOPER_ERROR) with curl and device logs

## Where the error happens

The flow is:

1. **Step 1 (on device):** App calls `GoogleSignin.signIn()` → native SDK talks to **Google’s** servers.  
   **DEVELOPER_ERROR happens here.** No request is sent to your backend or Supabase yet.

2. **Step 2:** If Step 1 succeeds, app gets a Google ID token and exchanges it with **Supabase** (`signInWithIdToken`).

3. **Step 3:** App sends the Supabase access token to **your backend** `POST /api/auth/google`.

So **curl cannot reproduce DEVELOPER_ERROR** – it occurs between the app and Google’s OAuth servers. Curl is still useful to confirm that your backend and Supabase are fine once a valid token exists.

---

## 1. See the exact error on the device (adb logcat)

Connect the Android device (or emulator), reproduce the error, then run:

```bash
# Clear log then reproduce Sign in; then run (within a few seconds):
adb logcat -d | grep -iE "google|signin|developer_error|RNGoogleSignin|auth"
```

Or capture a short snippet around the tap:

```bash
adb logcat -c && echo "Tap Sign in with Google now..." && sleep 15 && adb logcat -d > /tmp/signin_log.txt
```

Then open `/tmp/signin_log.txt` and search for `DEVELOPER_ERROR`, `Google`, `SignIn`, or your app package `com.minaezzat.onesteps`. The log may show the exact failure reason (e.g. which certificate was checked).

---

## 2. Test your backend with curl (once you have a valid token)

This checks that **your backend** accepts a valid Supabase access token. Use a token you get from a **successful** sign-in (e.g. on **iPhone**, or after fixing Android).

### Get a Supabase access token from iOS

- Sign in with Google on **iPhone** (which works).
- In your app or via a temporary `console.log` / debugger, capture the Supabase **access token** (or the token you send to the backend after Google Sign-In).  
  Alternatively, use your backend’s login response (e.g. `data.token` or `data.accessToken`) after a successful Google sign-in on iOS.

### Call your backend with curl

```bash
# Replace YOUR_SUPABASE_ACCESS_TOKEN with the token from a successful Google sign-in (e.g. from iOS)
curl -s -w "\nHTTP_CODE:%{http_code}\n" -X POST \
  "https://onecrew-backend-staging-309236356616.us-central1.run.app/api/auth/google" \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"YOUR_SUPABASE_ACCESS_TOKEN"}'
```

- If you get **2xx** and JSON with user/token → backend is fine; the problem is only Step 1 on Android (client config / SHA-1).
- If you get **4xx/5xx** → backend or token format may be wrong; inspect the response body.

---

## 3. (Optional) Test Supabase token exchange with curl

This checks that **Supabase** accepts a Google ID token. You need a **Google ID token** (not the Supabase access token). Easiest is to log it from the app when sign-in works (e.g. on iOS) before exchanging with Supabase.

```bash
# Replace YOUR_GOOGLE_ID_TOKEN with a real Google ID token (e.g. from iOS app log)
# Replace YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY from app.json / env
curl -s -w "\nHTTP_CODE:%{http_code}\n" -X POST \
  "https://YOUR_SUPABASE_URL/auth/v1/token?grant_type=id_token" \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -d '{"provider":"google","id_token":"YOUR_GOOGLE_ID_TOKEN"}'
```

If this returns 200 and a session, Supabase is fine and the issue is only Step 1 on Android.

---

## Summary

| What you’re testing | How | What it proves |
|---------------------|-----|----------------|
| Exact failure on device | `adb logcat` while tapping Sign in | Tells you why Google rejects the request (e.g. wrong cert) |
| Backend | curl `POST /api/auth/google` with valid Supabase token (from iOS) | Backend is OK; problem is Android client config |
| Supabase | curl `POST .../auth/v1/token?grant_type=id_token` with Google ID token | Supabase is OK; problem is Android client config |

**DEVELOPER_ERROR** is fixed by ensuring the **App signing key certificate** SHA-1 (and optionally SHA-256) for package `com.minaezzat.onesteps` is registered in the **same** Google Cloud project (309236356616) that has your Web Client ID. Curl plus logcat helps you confirm the rest of the chain is working.
