# Fix: OAuth Page Shows "localhost" and Browser Cancels

## Problem

The OAuth flow shows "localhost" at the top of the page and the browser immediately cancels. This is because Supabase's **Site URL** is set to `http://localhost:3000` in the project settings.

## Solution: Update Supabase Site URL

### Step 1: Go to Supabase Project Settings

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `uwdzkrferlogqasrxcve`
3. Navigate to **Settings** → **API** (or **Project Settings** → **General**)
4. Find the **Site URL** field

### Step 2: Update Site URL

The Site URL should be set to your app's URL scheme or a valid URL:

**Option 1: Use your app's URL scheme (Recommended)**
```
com.minaezzat.onesteps://
```

**Option 2: Use a placeholder URL (if option 1 doesn't work)**
```
https://onecrew.app
```
or
```
https://app.onecrew.com
```

**Option 3: Use your backend URL**
```
https://onecrew-backend-309236356616.us-central1.run.app
```

### Step 3: Save and Wait

1. Click **Save**
2. Wait 10-15 seconds for changes to propagate
3. Try signing in again

## Why This Happens

Supabase uses the **Site URL** in the OAuth state parameter. When it's set to `localhost`, it can cause:
- Browser to show "localhost" in the address bar
- OAuth flow to fail or cancel immediately
- Redirect issues

## Alternative: Override Site URL in Code

If you can't change the Site URL in Supabase Dashboard, you can try overriding it in the OAuth options:

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: redirectUrl,
    skipBrowserRedirect: false,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
    // Try to override site URL if possible
  },
});
```

However, the best solution is to update the Site URL in Supabase Dashboard.

## Quick Checklist

- [ ] Go to Supabase Dashboard → Settings → API
- [ ] Find "Site URL" field
- [ ] Change from `http://localhost:3000` to `com.minaezzat.onesteps://` or a valid URL
- [ ] Save changes
- [ ] Wait 10-15 seconds
- [ ] Try signing in again

## Verification

After updating:
1. The OAuth page should no longer show "localhost"
2. The browser should not cancel immediately
3. The OAuth flow should proceed to Google sign-in




