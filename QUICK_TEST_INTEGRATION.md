# Quick Test Integration Guide

## Fastest Way to Test Profile Switching

### Step 1: Add Test Button to Settings Page

Add this to `src/pages/SettingsPage.tsx`:

```typescript
import React, { useState } from 'react';
import { Modal } from 'react-native';
import { ProfileSwitchTest } from '../utils/ProfileSwitchTest';

// Inside SettingsPage component:
const [showTest, setShowTest] = useState(false);

// Add to your settings items array (around line 100):
{
  id: 'profile-test',
  title: 'Profile Switching Test',
  icon: 'flask-outline',
  action: () => setShowTest(true),
  showArrow: true,
}

// Add before closing View (around line 280):
{showTest && (
  <Modal
    visible={showTest}
    animationType="slide"
    onRequestClose={() => setShowTest(false)}
  >
    <ProfileSwitchTest onClose={() => setShowTest(false)} />
  </Modal>
)}
```

### Step 2: Run the Test

1. Open the app
2. Go to Settings
3. Tap "Profile Switching Test"
4. Click "Run Continuous Test (10 switches)"
5. Watch the results

### Step 3: Check Results

Look for:
- ✅ All switches successful (error count = 0)
- ✅ StreamChat shows "Connected: ✅" after each switch
- ✅ No app restarts
- ✅ No ChatContext errors in console

## Alternative: Add to App.tsx (Temporary)

For quick testing, add this to `App.tsx`:

```typescript
import { ProfileSwitchTest } from './src/utils/ProfileSwitchTest';

// In AppContent component, add:
{__DEV__ && (
  <View style={{ position: 'absolute', top: 100, right: 10, zIndex: 9999 }}>
    <ProfileSwitchTest />
  </View>
)}
```

## What the Test Does

1. **Loads your companies** - Gets list of companies you're owner/admin of
2. **Switches profiles** - Alternates between user and company profiles
3. **Checks StreamChat** - Verifies connection after each switch
4. **Logs results** - Shows success/error for each switch
5. **Counts errors** - Tracks how many switches failed

## Expected Results

### ✅ Success
```
✅ Successfully switched to company profile
✅ Successfully switched to user profile
✅ Successfully switched to company profile
...
✅ Test completed: 10 successful switches, 0 errors
```

### ❌ Failure (if issues exist)
```
❌ Switch to company failed - state mismatch
❌ Error during switch: ...
⚠️ Failed to reconnect StreamChat (non-critical): ...
```

## Cleanup

After testing, remove the test component:
1. Remove imports
2. Remove test button/modal
3. Keep the component file for future use

