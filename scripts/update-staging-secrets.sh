#!/bin/bash

# Script to update Stream Chat secrets in Google Cloud Secret Manager for staging
# Usage: ./update-staging-secrets.sh

set -e

PROJECT_ID="steps-479623"
STREAM_API_KEY="j8yy2mzarh3n"
STREAM_API_SECRET="zyjb2pp4ecxf5fpmnu3ekv5zzugs4uhmz92s3t583earzby3s6cesbtjyrjyesba"

echo "🔐 Updating Stream Chat secrets in Google Cloud Secret Manager..."
echo "Project: $PROJECT_ID"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    echo "   Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Error: Not authenticated with gcloud"
    echo "   Run: gcloud auth login"
    exit 1
fi

# Set the project
echo "📋 Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Update Stream Chat API Key
echo ""
echo "🔑 Updating stream-api-key secret..."
echo -n "$STREAM_API_KEY" | gcloud secrets versions add stream-api-key \
  --data-file=- \
  --project=$PROJECT_ID

if [ $? -eq 0 ]; then
    echo "✅ stream-api-key updated successfully"
else
    echo "❌ Failed to update stream-api-key"
    echo "   Make sure the secret exists. Create it with:"
    echo "   echo -n '$STREAM_API_KEY' | gcloud secrets create stream-api-key --data-file=- --project=$PROJECT_ID"
    exit 1
fi

# Update Stream Chat Secret
echo ""
echo "🔑 Updating stream-api-secret secret..."
echo -n "$STREAM_API_SECRET" | gcloud secrets versions add stream-api-secret \
  --data-file=- \
  --project=$PROJECT_ID

if [ $? -eq 0 ]; then
    echo "✅ stream-api-secret updated successfully"
else
    echo "❌ Failed to update stream-api-secret"
    echo "   Make sure the secret exists. Create it with:"
    echo "   echo -n '$STREAM_API_SECRET' | gcloud secrets create stream-api-secret --data-file=- --project=$PROJECT_ID"
    exit 1
fi

echo ""
echo "✅ All secrets updated successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Trigger staging deployment (see STAGING_DEPLOYMENT_GUIDE.md)"
echo "   2. Test the endpoint: ./test-staging-endpoint.sh"
echo "   3. Update frontend baseUrl to staging"
echo "   4. Test Stream Chat in the app"

