#!/usr/bin/env bash
#
# Verify Google Cloud and backend configuration using gcloud CLI.
# Run: ./scripts/verify-gcp-config.sh
# Requires: gcloud installed and logged in (gcloud auth login).
#

set -e

# Project that has the Web Client ID and Cloud Run backend (project number 309236356616)
BACKEND_PROJECT_ID="steps-479623"
BACKEND_PROJECT_NUMBER="309236356616"
STAGING_URL="https://onecrew-backend-staging-309236356616.us-central1.run.app"
EXPECTED_WEB_CLIENT_ID="309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj.apps.googleusercontent.com"
ANDROID_PACKAGE="com.minaezzat.onesteps"
# Firebase project (different from backend GCP project)
FIREBASE_PROJECT_ID="steps-cfc27"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 GCP & Cloud Run config verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

FAIL=0

# 1. gcloud auth
if ! command -v gcloud &>/dev/null; then
  echo "❌ gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install"
  exit 1
fi
echo "✅ gcloud found: $(gcloud version 2>/dev/null | head -1)"
echo ""

# 2. List projects and confirm backend project exists
echo "📋 Projects (looking for $BACKEND_PROJECT_ID and $FIREBASE_PROJECT_ID)..."
if gcloud projects list --format="value(projectId,projectNumber)" 2>/dev/null | grep -q "$BACKEND_PROJECT_ID"; then
  NUM=$(gcloud projects describe "$BACKEND_PROJECT_ID" --format="value(projectNumber)" 2>/dev/null || true)
  if [ "$NUM" = "$BACKEND_PROJECT_NUMBER" ]; then
    echo "   ✅ Backend project: $BACKEND_PROJECT_ID (project number $BACKEND_PROJECT_NUMBER)"
  else
    echo "   ✅ Backend project: $BACKEND_PROJECT_ID (project number: $NUM)"
  fi
else
  echo "   ❌ Project $BACKEND_PROJECT_ID not found or no access."
  FAIL=1
fi
if gcloud projects list --format="value(projectId)" 2>/dev/null | grep -q "^${FIREBASE_PROJECT_ID}$"; then
  echo "   ✅ Firebase project: $FIREBASE_PROJECT_ID"
else
  echo "   ⚠️  Firebase project $FIREBASE_PROJECT_ID not in list (may be in different account)"
fi
echo ""

# 3. Cloud Run services in backend project
echo "📋 Cloud Run services (project=$BACKEND_PROJECT_ID)..."
if gcloud run services list --project="$BACKEND_PROJECT_ID" --format="table(SERVICE,REGION,URL)" 2>/dev/null | head -10; then
  echo "   ✅ Cloud Run list OK"
else
  echo "   ❌ Could not list Cloud Run services (check gcloud auth and project access)"
  FAIL=1
fi
echo ""

# 4. Staging URL reachable
echo "📋 Staging backend health..."
if curl -sS -o /dev/null -w "%{http_code}" --connect-timeout 5 "$STAGING_URL/api/health" 2>/dev/null | grep -q "200"; then
  echo "   ✅ $STAGING_URL/api/health → 200"
else
  echo "   ⚠️  $STAGING_URL/api/health not 200 or unreachable (network/curl)"
fi
echo ""

# 5. App config consistency (local files)
echo "📋 Local app config..."
if grep -q "$STAGING_URL" src/contexts/ApiContext.tsx 2>/dev/null; then
  echo "   ✅ ApiContext baseUrl uses staging URL"
else
  echo "   ⚠️  ApiContext baseUrl may differ from $STAGING_URL"
fi
if grep -q "$EXPECTED_WEB_CLIENT_ID" src/services/GoogleAuthService.ts 2>/dev/null; then
  echo "   ✅ GoogleAuthService WEB_CLIENT_ID matches $BACKEND_PROJECT_NUMBER-..."
else
  echo "   ❌ GoogleAuthService WEB_CLIENT_ID not found or different"
  FAIL=1
fi
if grep -q "\"package\": \"$ANDROID_PACKAGE\"" app.json 2>/dev/null; then
  echo "   ✅ app.json android.package = $ANDROID_PACKAGE"
else
  echo "   ⚠️  app.json android.package may differ"
fi
if grep -q "\"projectId\": \"$FIREBASE_PROJECT_ID\"" app.json 2>/dev/null; then
  echo "   ✅ app.json firebase projectId = $FIREBASE_PROJECT_ID"
else
  echo "   ⚠️  app.json firebase projectId may differ"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FAIL -eq 0 ]; then
  echo "✅ GCP / Cloud Run config checks passed."
else
  echo "❌ Some checks failed. Fix above and re-run."
fi
echo ""
echo "📌 OAuth (Google Sign-In): gcloud cannot list OAuth clients."
echo "   → In Google Cloud Console, open project: $BACKEND_PROJECT_ID"
echo "   → APIs & Services → Credentials"
echo "   → Ensure there is a Web client with ID: $EXPECTED_WEB_CLIENT_ID"
echo "   → Ensure there is an Android client: package $ANDROID_PACKAGE, SHA-1 from android/app/debug.keystore"
echo "   See ANDROID_GOOGLE_SIGNIN_DEVELOPER_ERROR.md for SHA-1 and steps."
echo ""
echo "📌 Firebase: use Firebase Console or Firebase CLI (firebase use $FIREBASE_PROJECT_ID; firebase apps:list)."
echo "   → Ensure Android app has package $ANDROID_PACKAGE and correct google-services.json in android/app/."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit $FAIL
