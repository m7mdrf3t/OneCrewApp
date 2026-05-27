# Quick Start - Testing with Local Backend

## ✅ Backend Running
- URL: `http://localhost:3000`
- Process ID: 18351

## Step 1: Test Endpoint (Verify Fix Works)

Run in terminal:
```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
./test-local-backend.sh
```

**Expected:** Should return `user_id` formatted as `onecrew_user_...`

## Step 2: Start Metro Bundler

```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
npx expo start --clear
```

Wait for Metro to show: `Metro waiting on http://localhost:8081`

## Step 3: Run iOS Simulator

**Option A:** Press `i` in Metro terminal  
**Option B:** In new terminal:
```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
npx expo run:ios
```

## Step 4: Test in Simulator

1. **Login:**
   - Email: `ghoneem77@gmail.com`
   - Password: `password123`

2. **Navigate to Messages:**
   - Tap "Messages" tab
   - Watch terminal for logs

3. **Check Success:**
   - Should NOT see "Connecting to chat..." stuck
   - Should see conversations list
   - Terminal should show: `✅ StreamChat: User connected successfully`

## ⚠️ iOS Simulator Note

iOS Simulator cannot access `localhost:3000` directly. 

**If you get connection errors, use your Mac's IP:**

1. Find your IP:
   ```bash
   ipconfig getifaddr en0
   ```
   Or check: System Preferences → Network → Wi-Fi → IP Address

2. Update `src/contexts/ApiContext.tsx` line 448:
   ```typescript
   baseUrl = 'http://YOUR_IP:3000' // Replace YOUR_IP with actual IP
   ```

3. Restart Metro and simulator

## Troubleshooting

- **Endpoint 404:** Backend not running or wrong URL
- **Connection refused:** Use Mac IP instead of localhost
- **"Connecting to chat..." stuck:** Check terminal logs for errors

