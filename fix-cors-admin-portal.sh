#!/bin/bash

# Script to fix CORS issue for Admin Portal
# This sets the ADMIN_PORTAL_URL environment variable in Google Cloud Run

SERVICE_NAME="onecrew-backend-309236356616"
REGION="us-central1"
ADMIN_PORTAL_URL="https://onecrew-admin-309236356616.us-central1.run.app"

echo "🔧 Setting ADMIN_PORTAL_URL environment variable..."
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo "Admin Portal URL: $ADMIN_PORTAL_URL"
echo ""

# Update the Cloud Run service with the new environment variable
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --set-env-vars="ADMIN_PORTAL_URL=$ADMIN_PORTAL_URL" \
  --platform=managed

echo ""
echo "✅ Environment variable updated!"
echo "The backend should now allow requests from: $ADMIN_PORTAL_URL"
echo ""
echo "Note: If you also have a frontend URL, you can set it with:"
echo "  --update-env-vars=\"ADMIN_PORTAL_URL=$ADMIN_PORTAL_URL,FRONTEND_URL=your-frontend-url\""














