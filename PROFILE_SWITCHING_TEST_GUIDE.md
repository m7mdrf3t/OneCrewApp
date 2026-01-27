# Profile Switching Test Guide

## Overview

This guide explains how to use the Profile Switching Test component to verify that all fixes for profile switching, ChatContext errors, and app restarts are working correctly.

## Test Component

The test component is located at: `src/utils/ProfileSwitchTest.tsx`

## How to Use

### Option 1: Add to Settings Page (Recommended)

1. Open `src/pages/SettingsPage.tsx` (or create a test settings page)
2. Add a button to open the test component:

```typescript
import { ProfileSwitchTest } from '../utils/ProfileSwitchTest';

// In your SettingsPage component:
const [showTest, setShowTest] = useState(false);

// Add a button:
<TouchableOpacity onPress={() => setShowTest(true)}>
  <Text>Run Profile Switching Test</Text>
</TouchableOpacity>

{showTest && (
  <Modal visible={showTest} onRequestClose={() => setShowTest(false)}>
    <ProfileSwitchTest onClose={() => setShowTest(false)} />
  </Modal>
)}
```

### Option 2: Add to Navigation (Temporary)

1. Add a test route to your navigation
2. Navigate to it from anywhere in the app

### Option 3: Direct Import in App.tsx (Quick Test)

Temporarily add the component to your main app:

```typescript
import { ProfileSwitchTest } from './src/utils/ProfileSwitchTest';

// In AppContent, conditionally render:
{__DEV__ && <ProfileSwitchTest />}
```

## Test Scenarios

### 1. Single Switch Test

1. Click "Switch to Company" (or "Switch to User")
2. Verify:
   - Profile switches successfully
   - No errors in console
   - StreamChat status shows connected
   - Conversations list loads correctly

### 2. Continuous Test (10 Switches)

1. Click "Run Continuous Test (10 switches)"
2. The test will:
   - Switch between user and company profiles 10 times
   - Check StreamChat connection after each switch
   - Log all results
   - Count successful switches and errors

3. Verify:
   - All 10 switches complete successfully
   - No app restarts
   - No ChatContext errors
   - StreamChat reconnects after each switch
   - Error count is 0

### 3. Manual Rapid Switching

1. Rapidly click "Switch to Company" and "Switch to User" buttons
2. Verify:
   - App doesn't crash
   - No errors accumulate
   - State updates correctly
   - StreamChat handles rapid switches gracefully

## What to Check

### ✅ Success Indicators

1. **No App Restarts**
   - App should never restart during profile switching
   - All switches should complete smoothly

2. **No ChatContext Errors**
   - No "useChatContext hook was called outside ChatContext Provider" errors
   - ChannelList should render correctly

3. **StreamChat Connection**
   - StreamChat should reconnect after each switch
   - Connection status should show "Connected: ✅"
   - User ID should match the current profile

4. **State Updates**
   - Profile type should update immediately
   - Company should be set/unset correctly
   - UI should reflect the current profile

5. **Conversations List**
   - Should load correctly after each switch
   - Should show correct conversations for current profile
   - No "Error loading channel list" messages

### ❌ Failure Indicators

1. **App Restarts**
   - If app restarts during switching, there's still an unhandled error

2. **ChatContext Errors**
   - If you see "useChatContext hook was called outside ChatContext Provider", the provider isn't wrapping correctly

3. **StreamChat Errors**
   - "tokens are not set" errors indicate connection issues
   - "disconnect was called" errors indicate timing issues

4. **State Mismatches**
   - If profile type doesn't match what you switched to, state update failed

5. **High Error Count**
   - If error count > 0, investigate the error messages in results

## Test Results Interpretation

### Test Results Format

Each test result shows:
- **Timestamp**: When the action occurred
- **Type**: `switch`, `error`, or `success`
- **Message**: Description of what happened

### Example Results

```
✅ Successfully switched to company profile
✅ Successfully switched to user profile
✅ Successfully switched to company profile
...
✅ Test completed: 10 successful switches, 0 errors
```

### Error Examples

```
❌ Switch to company failed - state mismatch
❌ Error during switch: Failed to load company
⚠️ Failed to reconnect StreamChat (non-critical): ...
```

## Troubleshooting

### No Companies Available

- **Issue**: "No companies available" warning
- **Solution**: Make sure you're owner or admin of at least one company
- **Check**: Verify company membership in the app

### StreamChat Not Connecting

- **Issue**: StreamChat status shows "Connected: ❌"
- **Solution**: Check backend token endpoint is working
- **Check**: Verify `getStreamChatToken` is returning valid tokens

### High Error Rate

- **Issue**: Error count > 0 in test results
- **Solution**: Check error messages in results for specific issues
- **Check**: Verify network connectivity and backend availability

## Expected Test Results

### Successful Test Run

```
🚀 Starting continuous profile switching test...
Switching to company profile...
✅ Successfully switched to company profile
Switching to user profile...
✅ Successfully switched to user profile
Switching to company profile...
✅ Successfully switched to company profile
... (8 more switches)
✅ Test completed: 10 successful switches, 0 errors
```

### StreamChat Status (After Each Switch)

```
Connected: ✅
State: connected
User ID: onecrew_company_... (or onecrew_user_...)
```

## Cleanup

After testing, remove the test component from your app:

1. Remove imports
2. Remove test buttons/routes
3. Keep the component file for future testing if needed

## Notes

- The test component is for development/testing only
- Don't include it in production builds
- Use `__DEV__` flag to conditionally include it
- Test results are stored in component state (cleared on unmount)

## Version

- **Version**: 1.3.6
- **Build Number**: 13
- **Date**: January 2026

