#!/bin/bash

# Complete staging deployment script
# Run this from the OneCrewApp directory

set -e

echo "🚀 Starting Staging Deployment Process..."
echo ""

# Step 1: Make scripts executable
echo "Step 1: Making scripts executable..."
chmod +x update-staging-secrets.sh test-staging-endpoint.sh
echo "✅ Scripts are now executable"
echo ""

# Step 2: Update Google Cloud Secrets
echo "Step 2: Updating Google Cloud Secrets..."
echo "This will update Stream Chat API key and secret in Google Cloud Secret Manager"
echo ""
read -p "Press Enter to continue (or Ctrl+C to cancel)..."
./update-staging-secrets.sh

echo ""
echo "✅ Secrets updated!"
echo ""
echo "📝 Next steps:"
echo "   1. Deploy code to staging (see instructions below)"
echo "   2. Wait for deployment to complete (5-10 minutes)"
echo "   3. Run: ./test-staging-endpoint.sh"
echo "   4. Update frontend baseUrl to staging"
echo ""
echo "To deploy code, run one of these:"
echo ""
echo "Option A (if staging auto-deploys on push):"
echo "  cd /Users/aghone01/Documents/CS/OneCrew_BE/OneCrewBE"
echo "  git checkout develop"
echo "  git pull origin develop"
echo "  git push origin develop"
echo ""
echo "Option B (manual Cloud Build):"
echo "  cd /Users/aghone01/Documents/CS/OneCrew_BE/OneCrewBE"
echo "  gcloud builds submit --config=cloudbuild-staging.yaml --project=cool-steps ."
echo ""








