# Install Google Cloud CLI (gcloud) on macOS

## Quick Installation (Recommended)

### Option 1: Using Homebrew (Easiest)

If you have Homebrew installed:

```bash
brew install --cask google-cloud-sdk
```

After installation, initialize gcloud:

```bash
gcloud init
```

### Option 2: Using Official Installer

1. **Download the installer:**
   ```bash
   curl https://sdk.cloud.google.com | bash
   ```

2. **Restart your shell or run:**
   ```bash
   exec -l $SHELL
   ```

3. **Initialize gcloud:**
   ```bash
   gcloud init
   ```

### Option 3: Manual Installation

1. Download from: https://cloud.google.com/sdk/docs/install
2. Extract the archive
3. Run the install script:
   ```bash
   ./google-cloud-sdk/install.sh
   ```
4. Restart your terminal or run:
   ```bash
   exec -l $SHELL
   ```

## After Installation

### 1. Authenticate with Google Cloud

```bash
gcloud auth login
```

This will open a browser window for you to sign in with your Google account.

### 2. Set the Project

```bash
gcloud config set project cool-steps
```

### 3. Verify Installation

```bash
gcloud --version
```

You should see output like:
```
Google Cloud SDK 450.0.0
```

### 4. Verify Authentication

```bash
gcloud auth list
```

You should see your account listed as ACTIVE.

## Now You Can Run the Scripts

Once gcloud is installed and authenticated:

```bash
cd /Users/aghone01/Documents/CS/OneCrewApp

# Make scripts executable (if not already)
chmod +x update-staging-secrets.sh test-staging-endpoint.sh

# Update secrets
./update-staging-secrets.sh

# After deployment, test endpoint
./test-staging-endpoint.sh
```

## Troubleshooting

### Issue: "command not found: gcloud"

**Solution:**
- Make sure you restarted your terminal after installation
- Or run: `exec -l $SHELL`
- Check if gcloud is in your PATH: `which gcloud`

### Issue: "Not authenticated"

**Solution:**
```bash
gcloud auth login
```

### Issue: "Permission denied" when running scripts

**Solution:**
```bash
chmod +x update-staging-secrets.sh test-staging-endpoint.sh
```

## Next Steps

After installing gcloud:

1. ✅ Authenticate: `gcloud auth login`
2. ✅ Set project: `gcloud config set project cool-steps`
3. ✅ Run: `./update-staging-secrets.sh`
4. ✅ Deploy code to staging
5. ✅ Test: `./test-staging-endpoint.sh`


