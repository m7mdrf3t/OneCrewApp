# Configuration verification (Firebase, Google Cloud Run, Google Sign-In)

This doc summarizes how to verify Firebase, Google Cloud Run, and OAuth (Google Sign-In) configuration using **gcloud CLI** and **Firebase CLI**, and what must be checked in the web consoles.

## Quick verification script

From the project root:

```bash
./scripts/verify-gcp-config.sh
```

Requires **gcloud** installed and logged in (`gcloud auth login`). The script checks:

- Backend GCP project exists (**steps-479623**, project number **309236356616**)
- Firebase project **steps-cfc27** (if visible)
- Cloud Run services in the backend project (including `onecrew-backend-staging`)
- Staging URL health (`/api/health`)
- Local app config (ApiContext baseUrl, GoogleAuthService Web Client ID, app.json package and Firebase projectId)

It does **not** list OAuth clients (those are only visible in Google Cloud Console).

---

## Project mapping (verified via gcloud)

| Purpose              | GCP Project ID  | Project number   | Notes |
|----------------------|------------------|------------------|--------|
| Backend / Web Client  | **steps-479623** | **309236356616** | Cloud Run, OAuth Web + Android clients must be here |
| Firebase (FCM, etc.)  | **steps-cfc27**  | 281166002151     | app.json `projectId`, Firebase Console |

Your **Web Client ID** (`309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj.apps.googleusercontent.com`) belongs to **steps-479623**. For Google Sign-In on Android, the **Android OAuth client** (package `com.minaezzat.onesteps` + SHA-1) must be created in **steps-479623**, not only in steps-cfc27.

---

## gcloud CLI checks

### Prerequisites

- Install: https://cloud.google.com/sdk/docs/install  
- Log in: `gcloud auth login`  
- Optional: set project `gcloud config set project steps-479623`

### Commands used by the script

```bash
# List projects (confirm steps-479623 and steps-cfc27)
gcloud projects list --format="table(projectId,name,projectNumber)"

# Cloud Run services in backend project
gcloud run services list --project=steps-479623 --format="table(SERVICE,REGION,URL)"

# Staging health (from any machine with curl)
curl -sS -o /dev/null -w "%{http_code}" https://onecrew-backend-staging-309236356616.us-central1.run.app/api/health
# Expect: 200
```

### What gcloud cannot do

- **OAuth 2.0 client IDs** (Web, Android, iOS) are not listable via gcloud. Create and verify them in [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials** (project **steps-479623**).

---

## Firebase CLI checks

### Install (optional)

```bash
# Global (may require sudo or fix npm permissions)
npm install -g firebase-tools

# Or use npx without installing
npx firebase-tools --version
```

Login (browser):

```bash
firebase login
```

### Useful commands

```bash
# List projects you have access to
firebase projects:list

# Use Firebase project (steps-cfc27)
firebase use steps-cfc27

# List apps (Android, iOS, Web) in that project
firebase apps:list

# Project info
firebase projects:list
```

Firebase CLI does **not** show OAuth clients or SHA-1 fingerprints; those are in **Google Cloud Console** (steps-479623 for Web/Android client) and **Firebase Console** (steps-cfc27 → Project settings → Your apps → Android app → SHA certificate fingerprints).

---

## Checklist: what to verify where

### Google Cloud Console (project **steps-479623**)

1. **APIs & Services → Credentials**
   - **Web client** (OAuth 2.0 Client ID, type “Web application”) with ID  
     `309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj.apps.googleusercontent.com`
   - **Android client** (OAuth 2.0 Client ID, type “Android”):
     - Package name: `com.minaezzat.onesteps`
     - SHA-1: from `android/app/debug.keystore` (see ANDROID_GOOGLE_SIGNIN_DEVELOPER_ERROR.md), e.g.  
       `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

### Firebase Console (project **steps-cfc27**)

1. **Project settings → Your apps**
   - Android app with package `com.minaezzat.onesteps`
   - SHA certificate fingerprints (optional for Sign-In; required for FCM if you use them)
2. **google-services.json** in `android/app/google-services.json`:
   - `project_id`: `steps-cfc27`
   - `client.client_info.android_client_info.package_name`: `com.minaezzat.onesteps`

### Local repo

| Item              | Expected |
|-------------------|----------|
| ApiContext baseUrl | `https://onecrew-backend-staging-309236356616.us-central1.run.app` (or your chosen backend) |
| GoogleAuthService WEB_CLIENT_ID | `309236356616-aqrrf2gvbaac7flpg5hl0hig6hnk1uhj.apps.googleusercontent.com` |
| app.json android.package | `com.minaezzat.onesteps` |
| app.json extra.firebaseConfig.projectId | `steps-cfc27` |
| android/app/debug.keystore | Used for debug builds; its SHA-1 must be in GCP project steps-479623 as Android OAuth client |

---

## Summary

- **Backend and Google Sign-In**: Use GCP project **steps-479623** (number 309236356616). Cloud Run and OAuth Web + Android clients live here. Use `./scripts/verify-gcp-config.sh` and Cloud Console to verify.
- **Firebase**: Use project **steps-cfc27** for FCM and Firebase features. Use Firebase Console or `firebase use steps-cfc27 && firebase apps:list` to verify.
- **Android Google Sign-In (DEVELOPER_ERROR)**: Add the SHA-1 from **android/app/debug.keystore** to an **Android** OAuth client in **steps-479623** (same project as the Web client). See ANDROID_GOOGLE_SIGNIN_DEVELOPER_ERROR.md.
