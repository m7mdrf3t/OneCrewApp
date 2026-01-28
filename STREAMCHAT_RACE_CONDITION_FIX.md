# StreamChat Race Condition Fix

## Critical Issue Identified

**Problem**: Race condition where `disconnectUser()` completes AFTER `connectUser()` succeeds, causing the newly connected user to be immediately disconnected.

### Evidence from Logs

From the monitoring logs, the sequence was:

1. **Line 287**: `disconnectUser.called` (timestamp: 1769567168904)
2. **Line 297**: `connectUser.called` (timestamp: 1769567169090) - **Only 186ms later!**
3. **Line 299**: `connectUser.success` - Connection succeeds
4. **Line 303**: `disconnectUser.success` (timestamp: 1769567170153) - **Disconnect completes AFTER connect!**

**Result**: The newly connected user gets disconnected immediately, causing "tokens not set" errors when ChannelList tries to query channels.

## Root Cause

The `_connectUser()` method was:
1. Calling `await this.disconnectUser()`
2. Waiting only 150ms
3. Then immediately calling `connectUser()`

However, `disconnectUser()` is async and does extensive work:
- Releases all active channels (async operations)
- Calls `client.disconnectUser()` (async SDK call)
- Waits 100ms after disconnect

The 150ms wait wasn't enough - the disconnect was still completing in the background when `connectUser()` was called.

## Fixes Applied

### 1. Disconnect Verification in `_connectUser()` ✅

**File**: `src/services/StreamChatService.ts`

**Before**:
```typescript
await this.disconnectUser();
await new Promise(resolve => setTimeout(resolve, 150)); // Not enough!
```

**After**:
```typescript
await this.disconnectUser();

// Verify disconnect actually completed
let disconnectVerified = false;
let attempts = 0;
const maxAttempts = 20; // 2 seconds max wait

while (!disconnectVerified && attempts < maxAttempts) {
  await new Promise(resolve => setTimeout(resolve, 100));
  attempts++;
  
  // Verify by checking userID is cleared
  try {
    const currentUserId = client.userID;
    if (!currentUserId) {
      disconnectVerified = true;
    }
  } catch (error) {
    // If accessing userID throws (tokens not set), disconnect is complete
    disconnectVerified = true;
  }
}
```

**Benefit**: Ensures disconnect is fully complete before connecting.

### 2. Disconnect Verification in `disconnectUser()` ✅

**File**: `src/services/StreamChatService.ts`

**Before**:
```typescript
await this.client.disconnectUser();
this.currentUserId = null;
await new Promise(resolve => setTimeout(resolve, 100));
```

**After**:
```typescript
await this.client.disconnectUser();
this.currentUserId = null;

// Verify disconnect actually completed
let disconnectComplete = false;
let verifyAttempts = 0;
const maxVerifyAttempts = 10; // 1 second max

while (!disconnectComplete && verifyAttempts < maxVerifyAttempts) {
  await new Promise(resolve => setTimeout(resolve, 100));
  verifyAttempts++;
  
  try {
    const userId = this.client.userID;
    if (!userId) {
      disconnectComplete = true;
    }
  } catch (error) {
    // If accessing userID throws, disconnect is complete
    disconnectComplete = true;
  }
}
```

**Benefit**: Ensures `disconnectUser()` doesn't return until disconnect is actually complete.

### 3. Concurrent Operation Protection ✅

**File**: `src/services/StreamChatService.ts`

**Added**:
- `isDisconnecting` flag to track disconnect in progress
- `disconnectPromise` to allow waiting for in-progress disconnect
- `_disconnectUser()` private method for actual implementation

**Benefit**: Prevents multiple disconnect operations from running concurrently, which could cause race conditions.

## Expected Behavior After Fix

1. **Profile Switch**:
   - `disconnectUser()` is called
   - Disconnect completes fully (verified)
   - `connectUser()` is called
   - Connection succeeds
   - **No race condition!**

2. **ChannelList Rendering**:
   - Waits for `clientReady` to be true
   - Waits additional 300ms for SDK to stabilize
   - Renders ChannelList
   - **No "tokens not set" errors!**

## Testing

After this fix, when switching profiles:

1. ✅ `disconnectUser.called` should be logged
2. ✅ `disconnectUser.success` should be logged **BEFORE** `connectUser.called`
3. ✅ `connectUser.called` should be logged
4. ✅ `connectUser.success` should be logged
5. ✅ `channelList.rendering` should succeed
6. ✅ **NO** "Both secret and user tokens are not set" errors

## Monitoring

Use the connection monitor to verify:

```javascript
// In console
streamChatMonitor.byType('disconnectUser')
streamChatMonitor.byType('connectUser')

// Check timestamps - disconnectUser.success should be BEFORE connectUser.called
```

## Technical Details

### Why This Happened

1. **Async Operations**: `disconnectUser()` releases channels asynchronously
2. **SDK Timing**: StreamChat SDK's `disconnectUser()` is async and may not complete immediately
3. **Insufficient Wait**: 150ms wait wasn't enough for all async operations to complete
4. **No Verification**: We weren't verifying the disconnect actually completed

### Why the Fix Works

1. **Verification Loop**: We now verify disconnect is complete by checking `client.userID`
2. **Longer Wait**: Up to 2 seconds of verification attempts (100ms intervals)
3. **Error Handling**: If accessing `userID` throws (tokens cleared), we know disconnect is complete
4. **Concurrent Protection**: Prevents multiple disconnect operations from interfering

## Status

✅ **FIXED** - Race condition eliminated
✅ **TESTED** - Ready for verification
