# Google Security Block - Login Blocked Issue

## What Happened?

Google detected your login attempt as suspicious and blocked it. This is a security feature from Google to protect your account. This commonly happens when:

1. **New OAuth App**: The app is not yet verified/trusted by Google
2. **Development Environment**: Testing from a new device/location
3. **OAuth Configuration**: Missing or incomplete OAuth setup
4. **Unusual Activity**: Google sees the login pattern as suspicious

## Immediate Fix: Unblock Your Account

### Step 1: Check Your Email
1. Open the email from Google (subject: "Suspicious sign-in prevented" or similar)
2. Click **"Yes, it was me"** or **"Allow"** button
3. This will unblock the login attempt

### Step 2: Review Account Security
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Review recent security events
3. If you see the blocked login, click **"This was me"**

### Step 3: Allow Less Secure Apps (if needed)
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Scroll to **"Less secure app access"** (if available)
3. Enable it temporarily for testing (disable after testing)

## Long-term Fix: Proper OAuth Configuration

### 1. Verify OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **OAuth consent screen**
3. Make sure:
   - **User Type**: Internal (for Google Workspace) or External (for public)
   - **App name**: Your app name
   - **User support email**: Your email
   - **Developer contact information**: Your email
   - **Scopes**: `email`, `profile`, `openid`
   - **Test users** (if in Testing mode): Add your email address

### 2. Add Test Users (If App is in Testing Mode)

If your OAuth app is in "Testing" mode:
1. Go to **OAuth consent screen**
2. Scroll to **"Test users"**
3. Click **"+ ADD USERS"**
4. Add your Gmail address
5. Save

### 3. Publish Your App (For Production)

When ready for production:
1. Go to **OAuth consent screen**
2. Click **"PUBLISH APP"**
3. This makes it available to all users (no test users needed)

### 4. Verify OAuth Redirect URLs

Make sure your redirect URLs are properly configured:

**In Google Cloud Console:**
1. Go to **APIs & Services** → **Credentials**
2. Click on your **Web Client ID**
3. Under **Authorized redirect URIs**, add:
   ```
   https://uwdzkrferlogqasrxcve.supabase.co/auth/v1/callback
   ```
4. Save

**In Supabase:**
1. Go to Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Make sure redirect URLs include:
   ```
   com.minaezzat.onesteps://oauth/callback
   ```

## Prevent Future Blocks

### 1. Use App Password (Not Recommended for OAuth)

For testing only, you can use an App Password, but this is NOT recommended for OAuth flows.

### 2. Complete OAuth Setup

Make sure:
- ✅ OAuth consent screen is configured
- ✅ Test users are added (if in testing mode)
- ✅ Redirect URLs are correct
- ✅ Client ID and Secret are properly configured in Supabase

### 3. Use Your Personal Google Account for Testing

- Use the same Google account that owns the OAuth project
- This reduces security warnings

### 4. Enable 2-Step Verification

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. This makes your account more secure and reduces false positives

## Testing After Unblocking

1. **Unblock your account** (Step 1 above)
2. **Wait 5-10 minutes** for Google to update
3. **Try signing in again** from your app
4. If blocked again:
   - Check if you're a test user (if app is in testing mode)
   - Verify OAuth consent screen is published (if for production)
   - Check Google Account security settings

## Common Error Messages

### "Access blocked: This app's request is invalid"
- **Fix**: Complete OAuth consent screen setup
- **Fix**: Add yourself as a test user (if in testing mode)

### "Error 400: redirect_uri_mismatch"
- **Fix**: Add correct redirect URL in Google Cloud Console
- **Fix**: Match redirect URL in Supabase configuration

### "Error 403: access_denied"
- **Fix**: User denied permission (normal)
- **Fix**: Check OAuth consent screen scopes

### "Suspicious sign-in prevented"
- **Fix**: Click "Yes, it was me" in the email
- **Fix**: Review Google Account security settings

## Quick Checklist

- [ ] Unblocked account via email/security settings
- [ ] OAuth consent screen configured
- [ ] Added as test user (if app in testing mode)
- [ ] Redirect URLs configured correctly
- [ ] Client ID and Secret in Supabase
- [ ] Waited 5-10 minutes after unblocking
- [ ] Tried signing in again

## Still Having Issues?

1. **Check Google Cloud Console logs**:
   - Go to **APIs & Services** → **Credentials**
   - Check for any warnings or errors

2. **Check Supabase logs**:
   - Go to Supabase Dashboard → **Logs** → **API Logs**
   - Look for OAuth-related errors

3. **Try from a different Google account**:
   - Use a different Gmail account to test
   - This helps identify if it's account-specific

4. **Contact Support**:
   - If issues persist, contact Google Cloud Support
   - Or check Supabase community forums

## Important Notes

- ⚠️ **Never share your Client Secret** publicly
- ⚠️ **Don't disable 2-Step Verification** for security
- ✅ **Use test users** during development
- ✅ **Publish app** when ready for production
- ✅ **Monitor security alerts** from Google

