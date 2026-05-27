# Supabase OAuth Callback Configuration

## What You Need to Configure in Supabase

Yes, you need to configure the redirect URLs in Supabase so it knows where to send users after OAuth completes.

## Step-by-Step Configuration

### 1. Go to Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `uwdzkrferlogqasrxcve`
3. Navigate to **Authentication** → **Providers**
4. Click on **Google**

### 2. Enable Google Provider (if not already done)

1. Toggle **Enable Google provider** to **ON** (green)
2. Add your **Client ID**: `309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj.apps.googleusercontent.com`
3. Add your **Client Secret** (from Google Cloud Console)
4. Click **Save**

### 3. Add Redirect URLs (IMPORTANT!)

This is the key step for handling callbacks:

1. Scroll down to the **Redirect URLs** section
2. Click **"Add URL"** or the **"+"** button
3. Add these redirect URLs (one at a time):

   **For iOS:**
   ```
   com.minaezzat.onesteps://oauth/callback
   ```

   **For Android:**
   ```
   com.minaezzat.onesteps://oauth/callback
   ```

   **For Development (Expo):**
   ```
   exp://localhost:8081/--/oauth/callback
   ```

4. **Important**: Make sure the URLs match EXACTLY what's in your code:
   - No trailing slashes
   - Exact case matching
   - Include the `://` part

5. Click **Save** after adding each URL

### 4. Verify Configuration

After saving, you should see:
- ✅ Google provider enabled (green toggle)
- ✅ Client ID configured
- ✅ Client Secret configured (shows as "••••••••")
- ✅ Redirect URLs listed:
  - `com.minaezzat.onesteps://oauth/callback`
  - `exp://localhost:8081/--/oauth/callback` (if using Expo dev)

## How It Works

1. **User taps "Sign in with Google"** in your app
2. **App calls Supabase** `signInWithOAuth()` with redirect URL: `com.minaezzat.onesteps://oauth/callback`
3. **Supabase redirects to Google** for authentication
4. **User completes Google sign-in** (including phone verification if needed)
5. **Google redirects back to Supabase** with authorization code
6. **Supabase processes the code** and creates a session
7. **Supabase redirects to your app** using the redirect URL: `com.minaezzat.onesteps://oauth/callback`
8. **Your app receives the callback** via `WebBrowser.openAuthSessionAsync()`
9. **App extracts the code/token** from the URL and completes authentication

## Why This Is Needed

Supabase needs to know:
- ✅ Which URLs are allowed for redirects (security)
- ✅ Where to send users after OAuth completes
- ✅ How to handle the callback in your app

Without these redirect URLs configured, Supabase will reject the OAuth callback and you'll get errors like:
- "Invalid redirect URI"
- "Redirect URI mismatch"
- OAuth flow hangs or fails

## Quick Checklist

- [ ] Google provider enabled in Supabase
- [ ] Client ID added in Supabase
- [ ] Client Secret added in Supabase
- [ ] Redirect URL `com.minaezzat.onesteps://oauth/callback` added
- [ ] Redirect URL `exp://localhost:8081/--/oauth/callback` added (for dev)
- [ ] All changes saved
- [ ] Tested the OAuth flow

## Additional Notes

### Supabase Default Callback

Supabase also has a default callback URL that's automatically configured:
```
https://uwdzkrferlogqasrxcve.supabase.co/auth/v1/callback
```

This is used internally by Supabase and should already be configured. You don't need to add this manually.

### Google Cloud Console

Make sure in Google Cloud Console, your Web Client ID has this redirect URI:
```
https://uwdzkrferlogqasrxcve.supabase.co/auth/v1/callback
```

This allows Google to redirect back to Supabase, which then redirects to your app.

## Troubleshooting

### "Invalid redirect URI" Error

- Check that the redirect URL in Supabase matches exactly what's in your code
- Verify there are no extra spaces or characters
- Make sure the URL scheme is correct: `com.minaezzat.onesteps://oauth/callback`

### OAuth Flow Hangs

- Verify redirect URLs are saved in Supabase
- Check Supabase logs: Dashboard → Logs → API Logs
- Make sure deep linking is configured in `app.json` (already done)

### Callback Not Received

- Verify the URL scheme is registered in iOS `Info.plist` (already configured)
- Check that `WebBrowser.openAuthSessionAsync()` is being used (already implemented)
- Test the deep link manually: Try opening `com.minaezzat.onesteps://oauth/callback` in Safari

## Summary

**Yes, you need to add the redirect URLs in Supabase!**

The redirect URLs tell Supabase where to send users after OAuth completes. Without them, the callback won't work and the OAuth flow will fail.

