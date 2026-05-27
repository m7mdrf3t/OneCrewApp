# Development Server Connection Fix

## Issue
"Could not connect to development server" error when running app in iOS simulator.

## Quick Fix

### 1. Start Metro Bundler
```bash
npm start
# or
npx expo start
```

### 2. If Metro is Already Running
Try these steps:

#### Option A: Reset Metro Cache
```bash
# Stop Metro (Ctrl+C), then:
npm start -- --reset-cache
```

#### Option B: Restart Metro
```bash
# Stop Metro (Ctrl+C), then:
npm start
```

#### Option C: Check Network Connection
The error shows it's trying to connect to: `http://192.168.100.110:8081`

**Verify:**
1. Your computer's IP address matches `192.168.100.110`
   ```bash
   # On Mac/Linux:
   ifconfig | grep "inet "
   
   # On Windows:
   ipconfig
   ```

2. Metro is running on port 8081
   ```bash
   # Check if port 8081 is in use:
   lsof -i :8081
   ```

#### Option D: Use Localhost Instead
If you're running on simulator (not physical device), try:
```bash
# In app, shake device → Dev Settings → Change Bundle Location
# Set to: localhost:8081
```

### 3. Reload the App
- **iOS Simulator:** Press `⌘R` or shake device → Reload
- **Physical Device:** Shake device → Reload

### 4. Full Reset (If Above Doesn't Work)
```bash
# Stop Metro
# Clear Metro cache
rm -rf node_modules/.cache

# Clear Expo cache
npx expo start --clear

# Or full reset:
watchman watch-del-all
rm -rf node_modules
npm install
npm start -- --reset-cache
```

## Common Causes

1. **Metro Not Running**
   - Solution: Start Metro with `npm start`

2. **Wrong IP Address**
   - Solution: Check your computer's IP matches the URL

3. **Firewall Blocking Port 8081**
   - Solution: Allow port 8081 in firewall settings

4. **Network Changed**
   - Solution: Restart Metro after network change

5. **Cache Issues**
   - Solution: Clear cache with `--reset-cache` flag

## For TestFlight Builds

**Note:** This error only affects local development. TestFlight builds are standalone and don't need Metro bundler.

If you're testing the TestFlight build:
- This error won't occur (TestFlight uses bundled JavaScript)
- The app runs independently without Metro

## Next Steps

1. **For Local Development:**
   - Fix Metro connection using steps above
   - Test your changes locally

2. **For TestFlight:**
   - Build with `./build-testflight.sh`
   - TestFlight builds don't need Metro (they're fully bundled)
