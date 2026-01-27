# StreamChat Connection Fix - Profile Switching Error

## Issue

When switching to a company profile (e.g., "Bolt Academy") and opening the messages inbox, the app shows:
- Error: "Both secret and user tokens are not set. Either client.connectUser wasn't called or client.disconnect was called"
- Error: "An error occurred while getting app settings"
- "Error loading channel list..." message

## Root Cause

1. **Unread Count Calculation**: `calculateStreamChatUnreadCount` was calling `queryChannels()` on a disconnected client
2. **ConversationsListPage**: Was trying to render `ChannelList` before StreamChat was fully connected
3. **StreamChatProvider**: Was providing Chat context even when client wasn't connected, causing StreamChat hooks to fail

## Fixes Applied

### 1. ✅ calculateStreamChatUnreadCount - Connection Check

**File**: `src/contexts/ApiContext.tsx`

Added connection state checks before querying channels:
- Checks `streamChatService.isConnected()`
- Verifies `connectionState` is not 'disconnected' or 'offline'
- Returns 0 if not connected (instead of throwing error)

```typescript
// CRITICAL: Check if client is actually connected (not disconnected)
const isConnected = streamChatService.isConnected();
if (!isConnected) {
  return 0; // Skip calculation if not connected
}

// Additional check: verify connection state
const connectionState = (client as any)?.connectionState;
if (connectionState === 'disconnected' || connectionState === 'offline') {
  return 0; // Skip calculation if disconnected
}
```

### 2. ✅ ConversationsListPage - Connection State Check

**File**: `src/pages/ConversationsListPage.tsx`

Added explicit connection state verification before rendering ChannelList:
- Checks `isConnected` AND `connectionState`
- Verifies `currentStreamUserId` exists
- Shows loading state if not fully connected

```typescript
// CRITICAL: Check connection state explicitly before rendering ChannelList
const connectionState = client ? (client as any)?.connectionState : null;
const isActuallyConnected = isConnected && 
                            currentStreamUserId && 
                            connectionState !== 'disconnected' && 
                            connectionState !== 'offline';

if (!client || !isActuallyConnected || !currentStreamUserId) {
  return <LoadingState />; // Show loading until connected
}
```

### 3. ✅ StreamChatProvider - Conditional Chat Context

**File**: `src/components/StreamChatProvider.tsx`

Only provides Chat context when client is fully connected:
- Checks `isConnected()` before providing context
- Verifies `connectionState` is not disconnected/offline
- Verifies `userID` exists
- Prevents StreamChat hooks from accessing disconnected client

```typescript
// CRITICAL: Only provide StreamChat context when client is actually connected
const isConnected = streamChatService.isConnected();
const connectionState = (client as any)?.connectionState;
const hasUserId = !!client.userID;

// Only provide Chat context when fully connected
if (!isConnected || !hasUserId || connectionState === 'disconnected' || connectionState === 'offline') {
  return <>{children}</>; // Don't provide Chat context yet
}

return (
  <OverlayProvider value={{ style: theme }}>
    <Chat client={client}>
      {children}
    </Chat>
  </OverlayProvider>
);
```

## Testing

### Manual Testing Required

1. **Profile Switching:**
   - [ ] Switch from user profile to company profile (e.g., "Bolt Academy")
   - [ ] Open Messages inbox immediately after switching
   - [ ] Verify no "tokens are not set" errors
   - [ ] Verify conversations list loads correctly
   - [ ] Verify unread count displays correctly

2. **Connection State:**
   - [ ] Verify loading state shows while connecting
   - [ ] Verify Chat context is only provided when connected
   - [ ] Verify no errors in console during profile switch

3. **Unread Count:**
   - [ ] Verify unread count calculation doesn't throw errors
   - [ ] Verify unread count updates correctly after connection
   - [ ] Verify no errors when switching profiles

## Expected Behavior

1. **During Profile Switch:**
   - StreamChat disconnects from previous profile
   - Shows "Connecting to chat..." loading state
   - Reconnects with new profile
   - Conversations list loads after connection

2. **No Errors:**
   - No "tokens are not set" errors
   - No "app settings" errors
   - No "Error loading channel list" errors
   - Smooth transition between profiles

## Files Modified

1. `src/contexts/ApiContext.tsx` - Added connection checks in `calculateStreamChatUnreadCount`
2. `src/pages/ConversationsListPage.tsx` - Added connection state verification
3. `src/components/StreamChatProvider.tsx` - Conditional Chat context provision

## Version

- **Version**: 1.3.6
- **Build Number**: 13
- **Date**: January 2026

