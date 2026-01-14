# Complete gcloud Setup - Fix "command not found"

## Problem
gcloud was installed via Homebrew but isn't in your PATH, so you get "command not found".

## Quick Fix

### Step 1: Find and Setup gcloud

```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
chmod +x find-and-setup-gcloud.sh
./find-and-setup-gcloud.sh
```

This will:
- Find where gcloud was installed
- Add it to your PATH
- Set the Python path
- Test that it works

### Step 2: Restart Terminal or Reload Shell

After running the script, either:
- **Restart your terminal**, OR
- **Reload your shell:**
  ```bash
  source ~/.zshrc
  ```

### Step 3: Verify gcloud Works

```bash
gcloud --version
```

You should see the version number.

### Step 4: Complete gcloud Setup

```bash
# Set Python path (if not already set)
export CLOUDSDK_PYTHON=$(which python3)

# Initialize gcloud (if needed)
gcloud init

# Authenticate
gcloud auth login

# Set project
gcloud config set project cool-steps
```

### Step 5: Run Staging Deployment

```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
./update-staging-secrets.sh
```

## Manual Fix (If Script Doesn't Work)

### 1. Find gcloud Installation

```bash
# Check common locations
ls -la /opt/homebrew/share/google-cloud-sdk/bin/gcloud
ls -la ~/google-cloud-sdk/bin/gcloud
find /opt/homebrew -name "gcloud" 2>/dev/null
```

### 2. Add to PATH

Once you find it (e.g., at `/opt/homebrew/share/google-cloud-sdk/bin/gcloud`):

```bash
# Add to PATH for current session
export PATH="/opt/homebrew/share/google-cloud-sdk/bin:$PATH"

# Add to .zshrc for persistence
echo 'export PATH="/opt/homebrew/share/google-cloud-sdk/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### 3. Set Python Path

```bash
export CLOUDSDK_PYTHON=$(which python3)
echo 'export CLOUDSDK_PYTHON=$(which python3)' >> ~/.zshrc
```

### 4. Test

```bash
gcloud --version
```

## Alternative: Reinstall gcloud

If gcloud wasn't properly installed:

```bash
# Uninstall first
brew uninstall --cask google-cloud-sdk

# Reinstall
brew install --cask google-cloud-sdk

# Then run the setup script
cd /Users/aghone01/Documents/CS/OneCrewApp
./find-and-setup-gcloud.sh
```

## Troubleshooting

### Issue: Still "command not found" after adding to PATH

**Solution:**
1. Restart terminal completely
2. Or run: `source ~/.zshrc`
3. Verify: `echo $PATH | grep google-cloud-sdk`

### Issue: Python path errors

**Solution:**
```bash
export CLOUDSDK_PYTHON=$(which python3)
gcloud --version
```

### Issue: Installation incomplete

**Solution:**
```bash
# Complete the installation
/opt/homebrew/share/google-cloud-sdk/install.sh
# OR
~/google-cloud-sdk/install.sh
```


