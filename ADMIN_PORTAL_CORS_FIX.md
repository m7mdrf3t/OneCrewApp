# Admin Portal CORS Issue Fix

## Problem

The Admin Portal at `https://onecrew-admin-309236356616.us-central1.run.app` is being blocked by CORS when trying to authenticate with the backend at `https://onecrew-backend-309236356616.us-central1.run.app`.

### Error in Logs

```
❌ Origin blocked: https://onecrew-admin-309236356616.us-central1.run.app
✅ Allowed CORS origins: [ 'https://yourdomain.com' ]
```

### Root Cause

The backend is checking for the `ADMIN_PORTAL_URL` environment variable, but it's not set in production. The backend falls back to a default placeholder value `'https://yourdomain.com'`, which doesn't match the actual admin portal URL.

## Solution

Set the `ADMIN_PORTAL_URL` environment variable in your Google Cloud Run backend service.

### Method 1: Google Cloud Console (Recommended)

1. Go to [Google Cloud Console - Cloud Run](https://console.cloud.google.com/run)
2. Select your backend service: `onecrew-backend-309236356616`
3. Click **"Edit & Deploy New Revision"**
4. Navigate to the **"Variables & Secrets"** tab
5. Under **"Environment Variables"**, add or update:
   - **Name**: `ADMIN_PORTAL_URL`
   - **Value**: `https://onecrew-admin-309236356616.us-central1.run.app`
6. Click **"Deploy"** to apply the changes

### Method 2: Using gcloud CLI

Run the provided script:

```bash
chmod +x fix-cors-admin-portal.sh
./fix-cors-admin-portal.sh
```

Or manually run:

```bash
gcloud run services update onecrew-backend-309236356616 \
  --region=us-central1 \
  --set-env-vars="ADMIN_PORTAL_URL=https://onecrew-admin-309236356616.us-central1.run.app" \
  --platform=managed
```

### Method 3: Using Terraform (if applicable)

If you're using Infrastructure as Code, update your Terraform configuration:

```hcl
resource "google_cloud_run_service" "backend" {
  # ... other configuration ...
  
  template {
    spec {
      containers {
        env {
          name  = "ADMIN_PORTAL_URL"
          value = "https://onecrew-admin-309236356616.us-central1.run.app"
        }
      }
    }
  }
}
```

## Verification

After deploying, check the logs again. You should see:

```
✅ Allowed CORS origins: [ 'https://onecrew-admin-309236356616.us-central1.run.app' ]
✅ Origin allowed: https://onecrew-admin-309236356616.us-central1.run.app
```

## Additional Notes

- If you have a separate frontend application, you may also need to set `FRONTEND_URL`
- The backend should allow both origins if both are configured
- After updating the environment variable, the service will automatically restart with the new configuration
- Changes take effect immediately after deployment

## Related Environment Variables

The backend checks for these environment variables:
- `ADMIN_PORTAL_URL` - URL of the admin dashboard (required for admin portal access)
- `FRONTEND_URL` - URL of the main frontend application (if separate from admin portal)
- `NODE_ENV` - Should be set to `production` in production environment








