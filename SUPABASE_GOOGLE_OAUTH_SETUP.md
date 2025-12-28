# Supabase Google OAuth Setup Guide

## Error: "Unsupported provider: missing OAuth secret"

This error occurs because Google OAuth is not configured in your Supabase project. Follow these steps to fix it.

## Step 1: Get Google OAuth Credentials

You need:
1. **Client ID** (you already have this): `309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj.apps.googleusercontent.com`
2. **Client Secret** (you need to get this from Google Cloud Console)

### Get Client Secret from Google Cloud Console:

**Important:** You need the **Web Client ID**, NOT the iOS Client ID. iOS clients don't have secrets.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (project ID: `309236356616`)
3. Navigate to **APIs & Services** → **Credentials**
4. In the list of OAuth 2.0 Client IDs, look for one with type **"Web application"** (NOT iOS)
   - If you don't see a Web Client ID, you need to create one (see below)
5. Click on the **Web application** Client ID to view details
6. You should see:
   - **Client ID**: `309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj.apps.googleusercontent.com`
   - **Client secret**: Click "Show" or "Reveal" to see it (it will look like: `GOCSPX-xxxxxxxxxxxxxxxxxxxxx`)
7. Copy the **Client Secret**

### If you don't have a Web Client ID:

1. In the **Credentials** page, click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
2. Select **"Web application"** as the application type
3. Give it a name (e.g., "OneCrew Web Client")
4. Under **Authorized redirect URIs**, add:
   ```
   https://uwdzkrferlogqasrxcve.supabase.co/auth/v1/callback
   ```
5. Click **"CREATE"**
6. A popup will show both **Client ID** and **Client Secret** - copy both
7. If you miss the popup, click on the newly created client to see the secret

## Step 2: Configure Google OAuth in Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `uwdzkrferlogqasrxcve`
3. Navigate to **Authentication** → **Providers**
4. Find **Google** in the list and click on it
5. Toggle **Enable Google provider** to ON
6. Fill in the following:
   - **Client ID (for OAuth)**: `309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj.apps.googleusercontent.com`
   - **Client Secret (for OAuth)**: Paste the Client Secret from Step 1
7. Click **Save**

## Step 3: Configure Redirect URLs

### In Supabase Dashboard:

1. Still in **Authentication** → **Providers** → **Google**
2. Scroll down to **Redirect URLs** section
3. Add these redirect URLs:
   ```
   com.minaezzat.onesteps://oauth/callback
   exp://localhost:8081/--/oauth/callback
   ```
4. Click **Save**

### In Google Cloud Console (if needed):

1. Go back to Google Cloud Console
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   https://uwdzkrferlogqasrxcve.supabase.co/auth/v1/callback
   ```
5. Click **Save**

## Step 4: Verify Configuration

After saving in Supabase:
1. The Google provider should show as **Enabled** (green toggle)
2. You should see your Client ID listed
3. The redirect URLs should be saved

## Step 5: Test the Flow

1. Rebuild your app:
   ```bash
   npx expo run:ios --device "M7md2"
   ```
2. Try signing in with Google again
3. The error should be resolved

## Troubleshooting

### Still getting "missing OAuth secret" error?

1. **Double-check the Client Secret**:
   - Make sure you copied the entire secret (it's long)
   - Make sure there are no extra spaces
   - The secret should start with `GOCSPX-`

2. **Verify Supabase Configuration**:
   - Go to Supabase Dashboard → Authentication → Providers → Google
   - Make sure the toggle is ON (green)
   - Make sure both Client ID and Client Secret are filled in
   - Click Save again

3. **Check Redirect URLs**:
   - Make sure `com.minaezzat.onesteps://oauth/callback` is added
   - The URL should match exactly (no trailing slashes)

4. **Wait a few seconds**:
   - Sometimes Supabase takes a moment to propagate changes
   - Try again after 10-15 seconds

### "Invalid redirect URI" error?

- Make sure the redirect URL in your app matches exactly what's configured in Supabase
- Check that deep linking is properly configured in `app.json`

### Still having issues?

Check the Supabase logs:
1. Go to Supabase Dashboard → Logs → API Logs
2. Look for errors related to Google OAuth
3. Check the error messages for more details

## Quick Checklist

- [ ] Got Client Secret from Google Cloud Console
- [ ] Enabled Google provider in Supabase Dashboard
- [ ] Added Client ID in Supabase
- [ ] Added Client Secret in Supabase
- [ ] Added redirect URLs in Supabase
- [ ] Saved all changes
- [ ] Rebuilt the app
- [ ] Tested the sign-in flow

## Important Notes

- The Client Secret is sensitive - never commit it to version control
- The redirect URL must match exactly between your app and Supabase configuration
- Changes in Supabase may take a few seconds to propagate
- Make sure you're using the correct Supabase project (check the URL in your `app.json`)

