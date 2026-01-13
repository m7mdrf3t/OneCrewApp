# Fix gcloud Python Path Issue

## Problem
gcloud installation failed because it can't find Python 3.13 at the expected path.

## Quick Fix

### Option 1: Set Python Path and Reinstall (Recommended)

```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
chmod +x fix-gcloud-python.sh
./fix-gcloud-python.sh
```

Then reinstall gcloud components:
```bash
gcloud components reinstall
```

### Option 2: Manual Fix

1. **Find your Python 3 path:**
   ```bash
   which python3
   # or
   which python3.13
   # or
   which python3.12
   ```

2. **Set the environment variable:**
   ```bash
   export CLOUDSDK_PYTHON=$(which python3)
   ```

3. **Add to your shell profile (for persistence):**
   ```bash
   echo 'export CLOUDSDK_PYTHON=$(which python3)' >> ~/.zshrc
   source ~/.zshrc
   ```

4. **Reinstall gcloud components:**
   ```bash
   gcloud components reinstall
   ```

### Option 3: Use System Python

If you're using conda (base environment), try:

```bash
# Use conda's Python
export CLOUDSDK_PYTHON=$(conda info --base)/bin/python
gcloud components reinstall
```

## After Fixing

1. **Verify gcloud works:**
   ```bash
   gcloud --version
   ```

2. **Authenticate:**
   ```bash
   gcloud auth login
   ```

3. **Set project:**
   ```bash
   gcloud config set project cool-steps
   ```

4. **Run staging deployment:**
   ```bash
   cd /Users/aghone01/Documents/CS/OneCrewApp
   ./update-staging-secrets.sh
   ```

## Alternative: Skip Virtualenv

If you just want to use gcloud without the virtualenv setup:

```bash
# Set Python path
export CLOUDSDK_PYTHON=$(which python3)

# Try using gcloud directly
gcloud auth login
```

The virtualenv is optional - gcloud will work without it.

